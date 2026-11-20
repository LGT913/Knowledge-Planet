---
title: "D23 后端：行级 diff 对比 + 追加式回滚"
date: 2026-11-03
planet: growth
tags: ["QuillAgent", "文档", 2. D23 后端：行级 diff 对比 + 追加式回滚, growth]
summary: "- GET /api/documents/{id}/versions/compare?v1=&v2= 双版本行级 diff（diff-match-patch，不依赖外部命令）。 - POST /api/documents/{id}/vers"
private: false
---

## 2. D23 后端：行级 diff 对比 + 追加式回滚

### 2.1 任务

- `GET /api/documents/{id}/versions/compare?v1=&v2=` 双版本**行级 diff**（diff-match-patch，不依赖外部命令）。
- `POST /api/documents/{id}/versions/rollback` `{"versionId":123}`：**回滚保留历史不可覆写**。

### 2.2 依赖

`backend/pom.xml` `<dependencies>` 追加：

```xml
<!-- W4 D23：版本行级 diff（Google diff-match-patch 的 Java 移植，纯内存无外部命令） -->
<dependency>
    <groupId>org.bitbucket.cowwoc</groupId>
    <artifactId>diff-match-patch</artifactId>
    <version>1.2</version>
</dependency>
```

> 备选：若该坐标在镜像源拉取失败，可改用零依赖的**行级 LCS diff**（约 30 行，替换 `lineDiff` 即可），代码见本文件末尾附录 A。

### 2.3 代码

**`VersionService.java` 追加**（import 补充 `org.bitbucket.cowwoc.diff_match_patch.DiffMatchPatch`、`java.util.ArrayList`、`java.util.LinkedList`、`org.springframework.transaction.annotation.Transactional`）：

```java
    /** 双版本行级 diff（方向 v1 → v2）：基于纯文本投影，HTML 标签噪声不参与对比 */
    public VersionDtos.CompareResponse compare(Long documentId, Long v1, Long v2) {
        String plainA = DocumentService.toPlainText(getOwnedVersion(documentId, v1).getContent());
        String plainB = DocumentService.toPlainText(getOwnedVersion(documentId, v2).getContent());
        return new VersionDtos.CompareResponse(lineDiff(plainA, plainB));
    }

    /**
     * 追加式回滚（历史不可覆写）：
     * 1) 当前正文若不在历史中则先存档——保证"回滚前状态"可找回（防丢稿红线精神）；
     * 2) 复用 saveContent 将目标版本内容写回正文（纯 DB 事务，无网络调用）。
     * 事务内两段均快速提交，不做长事务。
     */
    @Transactional
    public Document rollback(Long documentId, Long versionId) {
        Document doc = documentService.get(documentId);
        DocVersion target = getOwnedVersion(documentId, versionId);   // 归属校验 → ERR-VERSION-001
        saveIfAbsent(doc, doc.getContent());
        return documentService.saveContent(documentId, target.getContent());
    }

    /** 校验版本存在且属于该文档（防跨文档引用） */
    private DocVersion getOwnedVersion(Long documentId, Long versionId) {
        DocVersion v = versionMapper.selectOne(new QueryWrapper<DocVersion>()
                .eq("id", versionId)
                .eq("document_id", documentId));
        if (v == null) {
            throw new BusinessException(ErrorCode.ERR_VERSION_001);
        }
        return v;
    }

    /** 内容已在历史中则不落新版本（与存版同一去重规则；并发冲突幂等兜底） */
    private void saveIfAbsent(Document doc, String content) {
        String hash = sha256(content);
        if (findByHash(doc.getId(), hash) != null) {
            return;
        }
        insertOrReturnExisting(new DocVersion(doc.getId(), nextVersionNo(doc.getId()), hash,
                content, DocumentService.computeCharCount(content), now()), doc);
    }

    /** 行级 diff：diff-match-patch linesToChars 语义，结果按行拆分，每行一条便于前端 in-line 着色 */
    private java.util.List<VersionDtos.DiffLine> lineDiff(String oldText, String newText) {
        DiffMatchPatch dmp = new DiffMatchPatch();
        DiffMatchPatch.LinesToCharsResult ltc = dmp.diffLinesToChars(oldText, newText);
        LinkedList<DiffMatchPatch.Diff> diffs = dmp.diffMain(ltc.chars1, ltc.chars2, false);
        dmp.diffCharsToLines(diffs, ltc.lineArray);
        dmp.diffCleanupSemantic(diffs);

        java.util.List<VersionDtos.DiffLine> lines = new ArrayList<>();
        for (DiffMatchPatch.Diff d : diffs) {
            String[] parts = d.text.split("\n", -1);
            for (int i = 0; i < parts.length; i++) {
                if (i == parts.length - 1 && parts[i].isEmpty()) {
                    break; // linesToChars 块末尾 \n 产生的空行残留，丢弃
                }
                lines.add(new VersionDtos.DiffLine(d.operation.toString(), parts[i]));
            }
        }
        return lines;
    }
```

**`DocVersionController.java` 追加**：

```java
    /** 双版本行级 diff（v1 → v2） */
    @GetMapping("/compare")
    public ApiResponse<CompareResponse> compare(@PathVariable Long documentId,
                                                @RequestParam Long v1,
                                                @RequestParam Long v2) {
        return ApiResponse.ok(versionService.compare(documentId, v1, v2));
    }

    /** 追加式回滚：当前正文先存档，再写回目标版本内容 */
    @PostMapping("/rollback")
    public ApiResponse<Document> rollback(@PathVariable Long documentId,
                                          @Valid @RequestBody RollbackRequest req) {
        return ApiResponse.ok(versionService.rollback(documentId, req.versionId()));
    }

    public record RollbackRequest(
            @jakarta.validation.constraints.NotNull(message = "versionId 不能为空") Long versionId) {
    }
```

### 2.4 设计说明（为什么这么做）

| 决策 | 理由 |
|---|---|
| 回滚 =「先存档当前正文 → 写回目标版本」，而非直接插一条同 hash 新版本 | 计划要求"回滚作为新版本追加、历史不可覆写"，但 `(document_id, content_hash)` 唯一索引禁止同内容重复落库。先存档当前正文，既满足"追加"（回滚前的状态成为新版本、可找回），又让写回后的正文 hash 自然命中目标版本记录（`isCurrent` 指向它），无需改表结构 |
| `version_no` 按文档独立递增（1,2,3…），不暴露全局自增 id | id 是跨文档全局值，直接展示会出现"第一篇的第三个版本显示 v7"；version_no 让前端稳定显示 v1/v2/v3，答辩与论文表述也更直观 |
| `isCurrent` 用 hash 比对计算、不落列 | 若落库存储，autosave 只改正文不产生版本（2s 防抖写 `document.content`），标记会立刻失真；回滚/手存版也需多处同步。计算方案以 `document.content` 为唯一事实来源，**任何时刻至多一条为 true**（唯一索引保证同文档同 hash 只有一条版本） |
| 唯一约束冲突捕获后按幂等成功返回 | 并发/兜底路径不能抛通用 500；返回已有版本 + `duplicated:true` 与预检路径语义一致，前端零分支 |
| diff 在纯文本投影上进行 | 正文是 TipTap HTML，标签差异会污染 diff；对比视图仅展示（不做合并），纯文本足够（03 规范 §1.9 投影口径复用） |
| 回滚写回走复用 `saveContent` | 字数、updated_at 口径与 autosave 完全一致，不引入第二套更新逻辑 |

---
