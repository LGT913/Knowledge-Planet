---
title: "D27‑D28 周末验收：单测 + curl + E2E + Tag v0.4"
date: 2026-11-03
planet: growth
tags: ["QuillAgent", "文档", 6. D27‑D28 周末验收：单测 + curl + E2E + Tag v0.4, growth]
summary: "backend/src/test/java/com/quill/agent/service/persistence/VersionServiceTest.java（新建）"
private: false
---

## 6. D27‑D28 周末验收：单测 + curl + E2E + Tag v0.4

### 6.1 单元/集成测试（收敛关键用例）

**`backend/src/test/java/com/quill/agent/service/persistence/VersionServiceTest.java`**（新建）

```java
package com.quill.agent.service.persistence;

import com.quill.agent.dto.VersionDtos.SaveVersionResponse;
import com.quill.agent.dto.VersionDtos.VersionVO;
import com.quill.agent.service.persistence.entity.Document;
import com.quill.agent.service.persistence.mapper.DocVersionMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** W4 版本链路关键用例（04 计划 §五 裁剪清单：单测收敛关键用例） */
@SpringBootTest(properties = "writer.data-dir=./target/w4-test-data")
class VersionServiceTest {

    @Autowired VersionService versionService;
    @Autowired DocumentService documentService;
    @Autowired DocVersionMapper versionMapper;

    Long docId;
    String v1 = "<p>第一行</p><p>第二行</p>";
    String v2 = "<p>第一行</p><p>第二行改</p><p>新增行</p>";

    @BeforeEach
    void setup() {
        versionMapper.delete(null);                     // 独立测试目录，测试间清库
        docId = documentService.create("W4测试", "NOVEL").getId();
    }

    @Test
    void 存版_versionNo按文档递增_去重不占号() {
        SaveVersionResponse a = versionService.saveSnapshot(docId, v1);
        assertFalse(a.duplicated());
        assertEquals(1, a.version().versionNo());

        SaveVersionResponse dup = versionService.saveSnapshot(docId, v1);
        assertTrue(dup.duplicated(), "相同内容必须去重");
        assertEquals(1, dup.version().versionNo(), "去重不消耗版本号");
        assertEquals(1L, versionMapper.selectCount(null), "版本数不变");

        SaveVersionResponse b = versionService.saveSnapshot(docId, v2);
        assertEquals(2, b.version().versionNo(), "新内容版本号 2");
    }

    @Test
    void 列表_isCurrent至多一条_且指向正文版本() {
        versionService.saveSnapshot(docId, v1);
        versionService.saveSnapshot(docId, v2);
        documentService.saveContent(docId, v2);          // 正文与 v2 一致
        List<VersionVO> versions = versionService.list(docId).versions();
        assertEquals(1, versions.stream().filter(VersionVO::isCurrent).count(), "至多一条 current");
        assertEquals(2, versions.stream().filter(VersionVO::isCurrent)
                .findFirst().orElseThrow().versionNo(), "current 应指向 v2");

        documentService.saveContent(docId, "临时修改");  // 正文改动未存版 → 无 current，标记不失真
        assertTrue(versionService.list(docId).versions().stream().noneMatch(VersionVO::isCurrent));
    }

    @Test
    void 回滚_当前正文先存档_再写回目标版本() {
        versionService.saveSnapshot(docId, v1);          // 存 v1
        documentService.saveContent(docId, v2);          // 正文改到 v2（未存版）
        versionService.rollback(docId, versionService.list(docId).versions().get(0).id());

        Document doc = documentService.get(docId);
        assertEquals(v1, doc.getContent(), "正文已写回 v1");
        assertEquals(2L, versionMapper.selectCount(null),
                "回滚前 v2 已自动存档 + 原 v1 = 2 条版本，历史不可覆写");
    }

    @Test
    void 对比_行级diff_删除与插入正确() {
        Long a = versionService.saveSnapshot(docId, v1).version().id();
        Long b = versionService.saveSnapshot(docId, v2).version().id();
        var diffs = versionService.compare(docId, a, b).diffs();
        assertTrue(diffs.stream().anyMatch(d -> d.op().equals("DELETE") && d.text().contains("第二行")));
        assertTrue(diffs.stream().anyMatch(d -> d.op().equals("INSERT") && d.text().contains("新增行")));
    }
}
```

**`backend/src/test/java/com/quill/agent/service/persistence/ExportServiceTest.java`**（新建）

```java
package com.quill.agent.service.persistence;

import com.quill.agent.exception.BusinessException;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** W4 导出关键用例：BOM / 标题转换 / docx 可重新打开 */
@SpringBootTest(properties = "writer.data-dir=./target/w4-test-data")
class ExportServiceTest {

    @Autowired ExportService exportService;
    @Autowired DocumentService documentService;

    String html = "<h1>章节一</h1><p>正文内容</p>";

    @Test
    void txt导出_UTF8_BOM开头() {
        Long id = documentService.create("T", "NOVEL").getId();
        var r = exportService.export(id, "txt");
        byte[] bytes = r.bytes();
        assertEquals(0xEF, Byte.toUnsignedInt(bytes[0]));
        assertEquals(0xBB, Byte.toUnsignedInt(bytes[1]));
        assertEquals(0xBF, Byte.toUnsignedInt(bytes[2]));
    }

    @Test
    void md导出_标题转井号前缀() {
        Long id = documentService.create("T", "NOVEL").getId();
        documentService.saveContent(id, html);
        String md = new String(exportService.export(id, "md").bytes(), StandardCharsets.UTF_8);
        assertTrue(md.contains("# 章节一"));
    }

    @Test
    void docx导出_可重新打开且段落正确() throws Exception {
        Long id = documentService.create("T", "NOVEL").getId();
        documentService.saveContent(id, html);
        byte[] bytes = exportService.export(id, "word").bytes();
        try (XWPFDocument doc = new XWPFDocument(new ByteArrayInputStream(bytes))) {
            assertEquals(2, doc.getParagraphs().size());
            assertEquals("Heading1", doc.getParagraphs().get(0).getStyle());
        }
    }

    @Test
    void 非法format_返回参数错误() {
        Long id = documentService.create("T", "NOVEL").getId();
        assertThrows(BusinessException.class, () -> exportService.export(id, "pdf"));
    }
}
```

### 6.2 curl 冒烟清单（PowerShell；TOKEN 路径以启动日志「SQLite 数据源就绪」目录为准）

```powershell
$T = Get-Content "$env:APPDATA\<你的应用名>\data\.local-token" -Raw
$B = "http://127.0.0.1:8080"

# 1) 手动存版（首次 versionNo=1；重复提交同内容 → 200 duplicated=true 且 versionNo 不变）
curl.exe -X POST "$B/api/documents/1/versions" -H "X-Local-Token: $T" -H "Content-Type: application/json" -d '{\"content\":\"<p>测试</p>\"}'

# 2) 版本列表（versionNo / isCurrent / contentHash / charCount；version_no 倒序）
curl.exe "$B/api/documents/1/versions" -H "X-Local-Token: $T"

# 3) 双版本行级 diff
curl.exe "$B/api/documents/1/versions/compare?v1=1&v2=2" -H "X-Local-Token: $T"

# 4) 回滚（应返回写回后的 document，且版本列表多出"回滚前状态"存档）
curl.exe -X POST "$B/api/documents/1/versions/rollback" -H "X-Local-Token: $T" -H "Content-Type: application/json" -d '{\"versionId\":1}'

# 5) 导出三格式（检查响应头 Content-Disposition 与文件可打开性）
curl.exe -o out.txt  "$B/api/documents/1/export?format=txt"  -H "X-Local-Token: $T"
curl.exe -o out.md   "$B/api/documents/1/export?format=md"   -H "X-Local-Token: $T"
curl.exe -o out.docx "$B/api/documents/1/export?format=word" -H "X-Local-Token: $T"
```

### 6.3 E2E 场景（写作核心闭环，逐条勾选）

1. 新建文档 → 写两段 → 点【保存当前版本】→ 面板出现 v1（标记"当前"）。
2. 继续修改 → 切到另一文档再切回（触发切离自动存版）→ 面板出现 v2。
3. 勾选 v1、v2 → 对比 → 红删/绿增着色正确（方向 v1→v2）。
4. 对 v1 点【回滚】→ 编辑器内容变为 v1（可 Ctrl+Z 撤销）→ 面板"当前"标记移至 v1，且回滚前的 v2 内容仍可在历史中找回。
5. 导出：网文文档默认 txt、自媒体默认 md、公文默认 word；手动覆盖 word → 保存对话框 → 文件可打开、格式正确、文件名 = 标题 + 扩展名。
6. 应用退出 → 重启 → 中途未手动存版的内容已作为版本存在。
7. 回归：W2 文档 CRUD、防丢稿草稿缓存；W3 续写/快捷处理不受影响。

### 6.4 文档同步与 Git 收口

- 同步 [02-接口文档.md](file:///c:/Users/lenovo/Desktop/agent/docs/02-接口文档.md)：§2.3 响应样例补 `versionNo`（示例见本文 §1.4）；补"重复存版 200+duplicated"语义说明；§2.4 补 `Content-Disposition` 文件名说明与"仅 .docx"边界。
- 同步 `03-生产规范.md` §1.7：`doc_version` 表新增 `version_no` 与唯一索引（表结构基准变更）。
- CHANGELOG 追加 v0.4 变更条目（含"老开发库需执行 version_no 迁移 SQL 或删库重建"）。

```powershell
cd [本地路径]
mvn -f backend/pom.xml test
git add backend electron docs
git commit -m "W4 阶段3 v0.4：文档版本（存版/行级对比/追加式回滚）+ txt/md/word 导出，M4 验收通过"
git tag -a v0.4 -m "M4: 存版/对比/回滚 + 三格式导出"
git push origin main --tags
```

---

## 7. 关键设计说明汇总

| 序号 | 决策 | 技术 → 解决的问题 |
|---|---|---|
| 1 | 存版 SHA-256 hash 去重 + DB 唯一索引 + 唯一约束冲突幂等兜底 | 内容未变不落新版本；hash 后端唯一计算（前端不传 hash）；冲突返回 200+duplicated，不抛通用 500 |
| 2 | 回滚 =「先存档当前正文 → 写回目标版本」 | 满足"回滚作为新版本追加 + 历史不可覆写"，同时与 hash 唯一约束兼容、守护防丢稿红线 |
| 3 | `isCurrent` 由 hash 比对实时计算（不落列），存版前先 autosave | 单一事实来源 document.content；autosave 不产生版本，若存储标记会立刻失真；唯一索引保证至多一条版本 hash 命中正文 |
| 4 | diff 用 Java 版 diff-match-patch 行级（纯内存） | 不依赖外部 `diff` 命令、跨平台一致；行级输出可直接支撑前端 in-line 着色 |
| 5 | diff 基于纯文本投影 | HTML 标签差异不污染对比结果；对比仅展示不合入，无需 HTML 级合并复杂性 |
| 6 | 回滚替换走 `editor.commands.setContent` | TipTap 事务进撤销栈，回滚可再撤销（03 §1.9），用户始终可控 |
| 7 | txt 加 BOM、md 不加；word 仅 POI 基础排版 | 记事本中文不乱码；md 保持纯文本规范；word 不承诺复杂样式（v1.0 降级项明示） |
| 8 | 导出文件名 `filename*` UTF-8 编码 + 双端清洗 | 中文文件名在 HTTP 安全传输；防 `Content-Disposition` 注入与 Windows 非法字符 |
| 9 | 自动存版仅在切离/退出触发 | 防高频写库；hash 去重后端兜底，前端零节流复杂度 |
| 10 | 退出收尾走「渲染应答 + 3s 超时」主进程编排 | axios 异步请求在窗口销毁前可靠完成；卡死时有兜底，不残留进程不丢版本 |
| 11 | 同文档递增 `version_no`（1,2,3…） | 前端展示 v1/v2 稳定可读，不暴露跨文档全局自增 id |
| 12 | 唯一约束冲突捕获（`DuplicateKeyException` / SQLite 2067、1555） | 并发或脏写路径不落 500，按幂等成功返回已有版本 |
| 13 | `toPlainText` 改 `public` + null 安全 | 导出/diff 跨包复用同一投影口径，空内容不抛异常 |
| 14 | `saveBinaryFile` 只收纯文件名 + 白名单校验 + 大小上限 | 渲染进程无法造成路径穿越；最终落盘位置由用户对话框确认 |
| 15 | 导出仅 `.docx`（POI 不支持 `.doc`），同步生成 | 能力边界在论文/FAQ 明示；单机大文档阻塞可接受，异步化 v1.1 |
| 16 | schema.sql 只放幂等 DDL，老库补列走启动迁移 `SchemaMigration` | schema 每次启动都执行；`ALTER`/`version_no` 索引写进去会让老库或二次启动直接失败；迁移逻辑集中一处、新库老库同路径 |

---

## 8. 风险与降级（对应 04 计划风险清单）

| 风险 | 应对 / 降级 | 后置项 |
|---|---|---|
| diff-match-patch 坐标拉取失败 | 换零依赖**行级 LCS diff**（附录 A），接口签名不变 | 无 |
| 大文档 diff 内存/耗时（2M 正文） | 行级对比 O(n·m) 上限可控（数千行）；diff 按需触发（用户点对比才计算） | v1.1 分块 diff |
| word 高级排版缺失 | 计划已降级：仅标题层级 + 段落；失败报 `ERR-INTERNAL-001` 引导回退 txt/md | v1.1 PDF/HTML 导出 |
| 前端 diff 视图复杂化 | 已按简版 in-line 着色实现；如阻塞可再降级为纯文本并排展示 | v1.1 双栏并排 + 滚动同步 |
| 自动存版高频写库 | 仅切离/退出触发一次；重复内容不落库 | v1.1 定时自动快照 |
| 并发重复存版触发唯一约束 | 捕获 `DuplicateKeyException` / SQLite UNIQUE(2067)、PRIMARYKEY(1555) → 幂等返回已有版本；非唯一约束异常照常上抛 | 无 |
| `version_no` 老库迁移 | `SchemaMigration` 启动时幂等补列 + 回填 + 建索引（仅缺列才 `ALTER`）；**启动冒烟必须连续跑两次**，确认第二次无 `duplicate column` 报错 | 无 |
| 旧版 `.doc` 不支持 | POI 仅生成 `.docx`；论文/FAQ 写明"仅支持 .docx 导出，旧格式由 Word 另存" | v1.1 如需 `.doc` 再评估转换器（不推荐） |
| 大文档 POI 同步生成阻塞请求线程 | 单机单用户可接受；失败 `ERR-INTERNAL-001` 引导回退 txt/md | v1.1 异步导出 |
| 二进制保存路径穿越 | IPC 只收纯文件名，禁 `/`、`\`、盘符、`..`、控制字符；默认目录 `exports`；最终路径由用户对话框确认 | 无 |
| 手存版后 `isCurrent` 短暂不显示 | VersionPanel 保存前先 `PUT /content`（autosave 同接口）再 POST 版本，保证新版本立即可命中当前标记 | 无 |

---

## 附录 A（备选）：零依赖行级 LCS diff

若 `org.bitbucket.cowwoc:diff-match-patch:1.2` 拉取失败，删除该依赖，用以下方法替换 `VersionService.lineDiff`（import 立即可用，不含第三方库）：

```java
    /** 行级 LCS diff（备选方案）：输出与 diff-match-patch 方案同构的 DiffLine 列表 */
    private java.util.List<VersionDtos.DiffLine> lineDiff(String oldText, String newText) {
        String[] a = oldText.split("\n", -1);
        String[] b = newText.split("\n", -1);
        int n = a.length, m = b.length;
        int[][] dp = new int[n + 1][m + 1];
        for (int i = n - 1; i >= 0; i--) {
            for (int j = m - 1; j >= 0; j--) {
                dp[i][j] = a[i].equals(b[j])
                        ? dp[i + 1][j + 1] + 1
                        : Math.max(dp[i + 1][j], dp[i][j + 1]);
            }
        }
        java.util.List<VersionDtos.DiffLine> out = new ArrayList<>();
        int i = 0, j = 0;
        while (i < n || j < m) {
            if (i < n && j < m && a[i].equals(b[j])) {
                out.add(new VersionDtos.DiffLine("EQUAL", a[i]));
                i++; j++;
            } else if (j >= m || (i < n && dp[i + 1][j] >= dp[i][j + 1])) {
                out.add(new VersionDtos.DiffLine("DELETE", a[i++]));   // 旧版有、新版无
            } else {
                out.add(new VersionDtos.DiffLine("INSERT", b[j++]));   // 新版新增
            }
        }
        return out;
    }
```

> 说明：LCS 是 3 次方最坏复杂度（当前按行拆分，正文规模下可接受）；diff-match-patch 语义优化更好，主方案优先，此为兜底。

---

## 附录 B：评审意见取舍记录（本版采纳 / 不采纳说明）

| 评审建议 | 判定 | 本版落地 |
|---|---|---|
| 唯一索引冲突捕获，不抛通用 ERR-INTERNAL | ✅ 采纳 | `insertOrReturnExisting` 捕获 `DuplicateKeyException` / SQLite 2067、1555 → 200 + `duplicated:true` |
| 冲突返回 ERR-VERSION-001（"内容无变化"） | ❌ 未采纳（语义冲突） | ERR-VERSION-001 已登记为"版本不存在/404"，compare/rollback 依赖该语义；重复存版用 200 + duplicated，前端提示"内容未变化" |
| 论文注明"版本以内容变更为触发条件" | ✅ 采纳 | §1.1 口径声明 + 实体/Service 注释 |
| 增加 `version_no`（前端显示 v1/v2） | ✅ 采纳 | DDL 迁移 + 实体 + VO + 前端显示 + 单测 |
| 论文写明 POI 仅支持 docx、大文件阻塞 | ✅ 采纳（口径修正为"导出 .docx"；本项目无导入功能） | §4.1 两条边界说明 |
| `toPlainText` 改 public + 非空校验 | ✅ 采纳 | §4.2 修改片段 |
| POI 异常映射 ERR-DOC-001 | ❌ 未采纳（语义冲突） | ERR-DOC-001 为"文档不存在"；生成失败保留 ERR-INTERNAL-001；如需细分可选新增 ERR-DOC-002（须同步 ErrorCode + 02 文档） |
| 新增 ERR-DOC-002 / ERR-FILE-001 | ⚠️ 可选，本版不做 | 遵守"禁止新增未登记错误码"红线；ERR-FILE-001 属于 Electron 主进程 UX 提示，不是后端 HTTP 错误码，放进 ErrorCode 会混淆职责 |
| `saveBinaryFile` 路径白名单 | ✅ 采纳（适配版） | 只收 basename，禁分隔符/盘符/`..`/控制字符，50MB 上限；默认目录 `exports`；最终路径由用户在系统对话框确认（若强制只能写程序目录，会破坏"另存到桌面/文档"的正常体验） |
| `isCurrent` 存储列 + 事务内先清后插 | ❌ 未采纳（会引入失真） | autosave 只改正文不产生版本，存储标记必然出现"标记为当前但正文已变"；hash 实时计算天然保证至多一条 current，已加专项测试；并发多标签由池=1串行 + 唯一索引共同保证 |
| SHA-256 后端统一计算，前端不传 hash | ✅ 采纳（原设计即如此） | §1.1/§1.4 明示：前端只传正文快照 |
| "前端只传文档 id、后端读库快照" | ❌ 未采纳（会丢未保存内容） | 编辑器 2s 防抖 autosave 尚未落库时，读库快照会漏掉最后一次编辑；手动存版必须接受编辑器当前 HTML，hash 仍由后端计算 |
