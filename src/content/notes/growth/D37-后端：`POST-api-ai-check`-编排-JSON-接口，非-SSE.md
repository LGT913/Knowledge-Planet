---
title: "D37 后端：`POST /api/ai/check` 编排（JSON 接口，非 SSE）"
date: 2026-10-31
planet: growth
tags: ["QuillAgent", "文档", 2. D37 后端：`POST /api/ai/check` 编排（JSON 接口，非 SSE）, growth]
summary: "- 规则引擎结果 + LLM 语义检查（MEDIA→FLATBEGIN / OFFICIAL→LOGICGAP；NOVEL 不调模型）合并返回。 - LLM 输出解析容错：非法 JSON / 超时 / 调用失败 → 仅返回规则结果，不报错（"
private: false
---

## 2. D37 后端：`POST /api/ai/check` 编排（JSON 接口，非 SSE）

### 2.1 任务

- 规则引擎结果 + LLM 语义检查（MEDIA→FLAT_BEGIN / OFFICIAL→LOGIC_GAP；**NOVEL 不调模型**）合并返回。
- LLM 输出解析容错：**非法 JSON / 超时 / 调用失败 → 仅返回规则结果，不报错**（降级信息写入 summary）。
- 语义检查范围 = 开头切片（默认 800 字，`check.llm.maxChars` 可配）；全文逐段逻辑检查为 v1.1（04 计划语义级 P2 裁剪口径）。
- 接口普通 JSON，**不走 AiStreamService**。

### 2.2 代码

**`backend/src/main/java/com/quill/agent/service/check/CheckService.java`**

```java
package com.quill.agent.service.check;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.quill.agent.config.AgentYmlConfig;
import com.quill.agent.dto.CheckDtos.CheckIssue;
import com.quill.agent.dto.CheckDtos.CheckResponse;
import com.quill.agent.dto.ModelConfig;
import com.quill.agent.service.modelrouter.ModelRouter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 全文自检编排（02-接口文档 §2.7）：
 * 词级 = CheckRuleEngine（纯函数，必做）；语义级 = ModelRouter 单轮（开头切片），
 * 非法 JSON / 超时 / 调用异常一律优雅降级为仅规则结果。
 * 安全：LLM 返回只取结构化字段，绝不执行其中的任何"指令"。
 */
@Service
public class CheckService {

    private static final Logger log = LoggerFactory.getLogger(CheckService.class);
    private static final Pattern SENTENCE = Pattern.compile("[^。！？!?；;]*[。！？!?；;]+|[^。！？!?；;]+$");

    private final CheckRuleEngine ruleEngine;
    private final AgentYmlConfig config;
    private final ModelRouter router;
    private final ObjectMapper objectMapper;

    public CheckService(CheckRuleEngine ruleEngine, AgentYmlConfig config,
                        ModelRouter router, ObjectMapper objectMapper) {
        this.ruleEngine = ruleEngine;
        this.config = config;
        this.router = router;
        this.objectMapper = objectMapper;
    }

    public CheckResponse check(String genre, String text, ModelConfig modelConfig) {
        List<CheckIssue> issues = new ArrayList<>(ruleEngine.check(genre, text));
        int ruleCount = issues.size();
        String degrade = "";

        if (!"NOVEL".equals(genre)) {           // NOVEL 无语义级检规，不调模型
            try {
                issues.addAll(semanticIssues(genre, text, modelConfig));
            } catch (Exception ex) {
                log.warn("语义检查降级（非法 JSON/超时/调用失败）：{}", ex.getMessage());
                degrade = "（语义检查未通过，仅词级结果）";
            }
        }
        int semanticCount = issues.size() - ruleCount;
        String summary = "共发现 " + issues.size() + " 个问题（词级 " + ruleCount
                + " 个，语义级 " + semanticCount + " 个）。" + degrade;
        return new CheckResponse(issues, summary);
    }

    /** 语义检查：开头切片单轮调用；LLM 只回 sentenceIndex + suggestion，offset 由本服务按句定位 */
    private List<CheckIssue> semanticIssues(String genre, String text, ModelConfig cfg) {
        int maxChars = config.intVal(800, "check", "llm", "maxChars");
        String slice = text.length() <= maxChars ? text : text.substring(0, maxChars);
        String sysKey = "MEDIA".equals(genre) ? "flatBegin" : "logicGap";
        String system = config.str("", "check", "semantic", sysKey);
        String user = "<document>\n" + slice + "\n</document>";
        int timeout = config.intVal(60, "check", "llm", "timeoutSeconds");

        String raw = router.stream(cfg, system, user)
                .collectList()
                .map(list -> String.join("", list))
                .block(Duration.ofSeconds(timeout));          // 聚合后按超时降级

        List<SemanticHit> hits = parseHits(raw);              // 非法 JSON → 抛异常由上层降级
        String[] sentences = sentences(slice);
        List<CheckIssue> issues = new ArrayList<>();
        for (SemanticHit h : hits) {
            int[] range = sentenceRange(sentences, h.sentenceIndex());
            issues.add(new CheckIssue(h.type(), "MAJOR", range[0], range[1],
                    text.substring(range[0], Math.min(range[1], text.length())),
                    h.suggestion(), null, h.sentenceIndex()));
        }
        return issues;
    }

    private List<SemanticHit> parseHits(String raw) {
        if (raw == null || raw.isBlank()) throw new IllegalStateException("empty semantic result");
        try {
            return objectMapper.readValue(raw, new TypeReference<List<SemanticHit>>() {
            });
        } catch (Exception ex) {
            throw new IllegalStateException("invalid semantic json", ex);
        }
    }

    /** 按句切分（含句尾标点），返回 [起,止) 绝对偏移 */
    private String[] sentences(String text) {
        List<String> list = new ArrayList<>();
        Matcher m = SENTENCE.matcher(text);
        while (m.find()) {
            list.add(m.group());
        }
        return list.toArray(String[]::new);
    }

    /** sentenceIndex → [offsetStart, offsetEnd)；越界回退整片 */
    private int[] sentenceRange(String[] sentences, int index) {
        if (sentences.length == 0) return new int[]{0, 0};
        int i = Math.max(0, Math.min(index, sentences.length - 1));
        int start = 0;
        for (int k = 0; k < i; k++) {
            start += sentences[k].length();
        }
        return new int[]{start, start + sentences[i].length()};
    }

    /** LLM 语义命中（仅信任这两个字段与哨兵类型，其余字段丢弃） */
    public record SemanticHit(String type, int sentenceIndex, String suggestion) {
    }
}
```

**`AiController.java`** 追加（普通 JSON，注入 `CheckService`）：

```java
    /** 全文自检（D37）：普通 JSON 接口，非 SSE；content 为纯文本投影 */
    @PostMapping("/check")
    public ApiResponse<CheckDtos.CheckResponse> check(@Valid @RequestBody CheckRequest req) {
        return ApiResponse.ok(checkService.check(normalizeGenre(req.genre()), req.content(), req.modelConfig()));
    }

    public record CheckRequest(
            @NotBlank(message = "genre 不能为空") String genre,
            @NotBlank(message = "content 不能为空")
            @Size(max = 200_000, message = "文档过长，请分段自检") String content,
            @NotNull(message = "modelConfig 不能为空") @Valid ModelConfig modelConfig) {
    }
```

---
