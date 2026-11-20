---
title: "D41‑D42 周末验收：单测 + curl + E2E + Tag v0.6"
date: 2026-10-31
planet: growth
tags: ["QuillAgent", "文档", 6. D41‑D42 周末验收：单测 + curl + E2E + Tag v0.6, growth]
summary: "backend/src/test/java/com/quill/agent/service/check/CheckRuleEngineTest.java"
private: false
---

## 6. D41‑D42 周末验收：单测 + curl + E2E + Tag v0.6

### 6.1 单元/集成测试（纯函数规则引擎为测试重点）

**`backend/src/test/java/com/quill/agent/service/check/CheckRuleEngineTest.java`**

```java
package com.quill.agent.service.check;

import com.quill.agent.dto.CheckDtos.CheckIssue;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** W6 规则引擎关键用例：按 genre 命中检规 + 幂等纯函数 + offset 正确 */
@SpringBootTest(properties = "writer.data-dir=./target/w6-test-data")
class CheckRuleEngineTest {

    @Autowired CheckRuleEngine engine;

    @Test
    void NOVEL_敏感词命中_offset正确() {
        String text = "这里的示例敏感词出现了";
        List<CheckIssue> issues = engine.check("NOVEL", text);
        CheckIssue hit = issues.stream().filter(i -> "SENSITIVE".equals(i.type())).findFirst().orElseThrow();
        assertEquals("示例敏感词", text.substring(hit.offsetStart(), hit.offsetEnd()));
        assertEquals("MAJOR", hit.severity());
    }

    @Test
    void NOVEL_邻近重复命中_首次出现不标() {
        String word = "仿佛";
        String text = (word + "，").repeat(4);
        List<CheckIssue> issues = engine.check("NOVEL", text);
        assertTrue(issues.stream().anyMatch(i -> "REPEAT_WORD".equals(i.type())));
        assertTrue(issues.stream().filter(i -> "REPEAT_WORD".equals(i.type()))
                .noneMatch(i -> i.offsetStart() == 0), "首次出现不应标记");
    }

    @Test
    void MEDIA_平淡词命中() {
        List<CheckIssue> issues = engine.check("MEDIA", "今天真的非常普通");
        assertTrue(issues.stream().anyMatch(i -> "FLAT_WORD".equals(i.type())));
    }

    @Test
    void OFFICIAL_口语词与超长段落命中() {
        String longPara = "段".repeat(301);
        List<CheckIssue> issues = engine.check("OFFICIAL", "咱们" + longPara);
        assertTrue(issues.stream().anyMatch(i -> "INFORMAL".equals(i.type())));
        assertTrue(issues.stream().anyMatch(i -> "FORMAT".equals(i.type())));
    }

    @Test
    void 纯函数幂等_同输入两次结果一致() {
        String text = "今天真的很普通，示例敏感词出现了，咱们差不多行了";
        List<CheckIssue> a = engine.check("NOVEL", text);
        List<CheckIssue> b = engine.check("NOVEL", text);
        assertEquals(a, b);
    }
}
```

**`backend/src/test/java/com/quill/agent/service/check/CheckServiceTest.java`**（LLM 降级双分支）

```java
package com.quill.agent.service.check;

import com.quill.agent.dto.ModelConfig;
import com.quill.agent.service.modelrouter.ModelRouter;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import reactor.core.publisher.Flux;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

/** W6 语义检查降级关键用例：非法 JSON 降级 / 正常 JSON 合并 */
@SpringBootTest(properties = "writer.data-dir=./target/w6-test-data")
class CheckServiceTest {

    @Autowired CheckService service;
    @MockitoBean ModelRouter router;

    @Test
    void LLM返回非法JSON_降级为仅规则结果_不抛异常() {
        when(router.stream(any(), any(), any())).thenReturn(Flux.just("这不是JSON"));
        var r = service.check("MEDIA", "今天真的很平淡的开头。", new ModelConfig(null, null, null, null, null, null, null, null));
        assertTrue(r.summary().contains("仅词级结果"), "summary 应说明降级");
        assertTrue(r.issues().stream().noneMatch(i -> "FLAT_BEGIN".equals(i.type())));
    }

    @Test
    void LLM返回正常JSON_语义问题按句定位合并() {
        when(router.stream(any(), any(), any()))
                .thenReturn(Flux.just("[{\"type\":\"FLAT_BEGIN\",\"sentenceIndex\":0,\"suggestion\":\"开头平庸\"}]"));
        var r = service.check("MEDIA", "今天真的很平淡的开头。", new ModelConfig(null, null, null, null, null, null, null, null));
        assertEquals(1, r.issues().stream().filter(i -> "FLAT_BEGIN".equals(i.type())).count());
        assertEquals("MAJOR", r.issues().stream().filter(i -> "FLAT_BEGIN".equals(i.type()))
                .findFirst().orElseThrow().severity());
    }

    @Test
    void NOVEL_不调语义模型() {
        when(router.stream(any(), any(), any())).thenThrow(new AssertionError("NOVEL 不应调用模型"));
        var r = service.check("NOVEL", "示例敏感词", new ModelConfig(null, null, null, null, null, null, null, null));
        assertTrue(r.issues().stream().anyMatch(i -> "SENSITIVE".equals(i.type())));
    }
}
```

> 注：`@MockitoBean` 在 Spring Boot 3.5 的包名为 `org.springframework.test.context.bean.override.mockito.MockitoBean`（3.4+ 迁移包）。若项目 Spring Framework 版本较旧则为 `org.springframework.boot.test.mock.mockito.MockBean`，按编译报错选择。

### 6.2 curl 冒烟清单（PowerShell）

```powershell
$T = Get-Content "$env:APPDATA\<你的应用名>\data\.local-token" -Raw
$B = "http://127.0.0.1:8080"

# 1) 规则级自检（NOVEL：敏感词 + 重复词；不含语义级、响应快）
curl.exe -X POST "$B/api/ai/check" -H "X-Local-Token: $T" -H "Content-Type: application/json" -d '{\"genre\":\"NOVEL\",\"content\":\"示例敏感词 仿佛，仿佛，仿佛\",\"modelConfig\":{\"mode\":\"LOCAL\"}}'

# 2) 语义级自检（MEDIA：FLAT_WORD + FLAT_BEGIN；观察 summary 是否出现"语义检查未通过"降级字样）
curl.exe -X POST "$B/api/ai/check" -H "X-Local-Token: $T" -H "Content-Type: application/json" -d '{\"genre\":\"MEDIA\",\"content\":\"今天真的非常普通。\",\"modelConfig\":{\"mode\":\"LOCAL\"}}'

# 3) 检规词库重载：修改 agent.yml 词条后
curl.exe -X POST "$B/api/prompt-templates/reload" -H "X-Local-Token: $T"
# 4) 故意改坏 agent.yml → 重载应返回 400 {"code":"ERR-CONFIG-001",...}
```

### 6.3 E2E 场景（逐条勾选）

1. **NOVEL**：写含敏感词 + 重复词文本 → 自检 → 标红下划线（MAJOR 红 / MINOR 黄）→ 悬浮卡片展示原文/建议 → 列表与标注数量一致。
2. **MEDIA**：平淡词标黄；FLAT_BEGIN 语义问题标红（本地 Ollama 未就绪时 summary 出现降级字样、不报错不中断）。
3. **OFFICIAL**：口语词 + 超长段落 FORMAT 命中；LOGIC_GAP 语义问题返回。
4. **交互闭环**：点问题行 → 正文跳转选中；一键替换 → 内容替换 + 该标记消失 + **Ctrl+Z 可撤销**；编辑任意文字 → 全部标红立即清空；再次自检重建。
5. **词库外部化**：改 agent.yml 平淡词词条 → 设置页重载 → 新词条立即命中；改坏 yml → 重载报 `ERR-CONFIG-001`、旧配置仍生效。
6. **回归**：W2 防丢稿、W3 续写/快捷、W4 版本/导出、W5 模板/大纲/灵感/素材全链路不受影响；自检标注不污染存版/导出内容。

### 6.4 文档同步与 Git 收口

- 02-接口文档 §2.7 已定义，无需改接口；如 summary 降级字样需要固定措辞，补充一行说明即可。
- 03-生产规范 §1.9 已含 offset 映射规范；补充"自检 Decoration 为视图层标注，不进入文档内容"一句。
- CHANGELOG 追加 v0.6 条目。

```powershell
cd [本地路径]
mvn -f backend/pom.xml test
git add backend electron docs
git commit -m "W6 阶段5 v0.6：自检规则引擎 + LLM 语义检查降级 + Decoration 标红替换闭环，M6 验收通过"
git tag -a v0.6 -m "M6: 全文自检标红替换闭环"
git push origin main --tags
```

---

## 7. 关键设计说明汇总（为什么这么做）

| # | 决策 | 技术 → 解决的问题 |
|---|---|---|
| 1 | 规则引擎纯函数（词库用 AgentYmlConfig 内存快照） | 幂等可测、无 IO 不阻塞；同输入两次结果一致是单测断言基础（04 计划"纯函数无 IO"要求） |
| 2 | yml 加载提取为 AgentYmlConfig，提示词与检规共用 | 一处加载、一处重载、全局生效：避免 PromptService 与检规各自解析 yml 状态不一致（D40 重载语义才可能成立） |
| 3 | reload 损坏回滚旧配置 + `ERR_CONFIG_001`（缺失文件才回退内置） | 满足 04 计划"配置损坏回滚旧配置"；与"删除文件=恢复出厂"语义区分开 |
| 4 | LLM 语义检查整体 try/catch 降级（非法 JSON/超时/失败 → 仅词级） | 语义级是 P2/MVP 外延，绝不能因模型输出不稳定拖垮必做的词级检查；降级信息透明写入 summary |
| 5 | LLM 只回 `sentenceIndex + suggestion`，offset 由后端按句定位 | 模型无法可靠产出字符偏移（3B 尤甚）；句号定位把"偏移正确性"收归确定性代码，模型只做能力内的事 |
| 6 | 语义检查限定开头切片 800 字（FLAT_BEGIN 语义决定；LOGIC_GAP 只查开头） | 单轮流式聚合 + 超时可控；全文逐段逻辑检查需要分类器级能力，列为 v1.1（04 计划语义级 P2 口径） |
| 7 | 标红用 ProseMirror Decoration（视图层），不进文档内容 | 标红不污染正文 HTML → 不影响存版 content_hash、导出、正文查询；与"编辑即清空"策略天然契合 |
| 8 | `docChanged` 即清空全部标记（不做实时增量标红） | 04 计划标红裁剪点：高频重算 offset 映射的性能开销被整体规避，交互语义简单可预期 |
| 9 | textBetween 口径一致的 runs 二分映射（含块分隔符占位） | 纯文本映射的唯一正解是与 `getText()` 同一条 textBetween 算法；快照 + 二分保证大文档 O(log n) 定位 |
| 10 | 替换走 `insertContentAt` TipTap 事务 + 移除该项后其余标记自然清空 | 满足"可撤销 + 防过期标记"；不做替换后重算剩余 offset（内容已变、绝对偏移失效），清空重检是最稳口径 |

---

## 8. 风险与降级（对应 04 计划风险清单）

| 风险 | 应对 / 降级 | 后置项 |
|---|---|---|
| LLM 输出不稳定（JSON 多出文字/字段缺失） | 提示词强约束"只输出 JSON 数组" + Jackson 解析 try/catch 降级；语料只有类型/句号/建议三个字段，多余字段丢弃 | v1.1 结构化输出（json mode / function calling） |
| n-gram 重复检测无分词库误报 | 仅在连续中日韩字段上统计 + 相邻窗口约束 + 每词只报一次 + 词库外部化可调参数 | v1.1 引入轻量分词（如 jieba-analysis）提升精度 |
| 敏感词典内置为占位示例 | 词库外部化到 agent.yml（用户自行扩充）；**发布前必须替换为真实词表**（交付红线，见本周任务） | v1.1 远程词库位 |
| 大文档性能（20 万字自检 + 映射） | UTF-16 线性扫描可接受；超 20 万字直接 `ERR_PARAM_001` 提示分段；映射二分定位 | v1.1 自检切片并行 |
| 悬浮卡片在滚动/缩放时偏移 | popup 用 `getBoundingClientRect` + fixed 定位，点击它处即关；不影响核心闭环 | v1.1 in-editor Widget decoration |
| 语义检查拖慢自检（60s 超时） | Novela 不调模型即刻返回；MEDIA/OFFICIAL 单轮 + 超时降级；词级结果先写入 issues 不等待模型 | v1.1 语义检查后台异步 + 可取消 |
