---
title: "CheckRuleEngine（纯函数）"
date: 2026-10-31
planet: growth
tags: ["QuillAgent", "文档", 1.5 CheckRuleEngine（纯函数）, growth]
summary: "backend/src/main/java/com/quill/agent/service/check/CheckRuleEngine.java（包 service.check 新建）"
private: false
---

### 1.5 CheckRuleEngine（纯函数）

**`backend/src/main/java/com/quill/agent/service/check/CheckRuleEngine.java`**（包 service.check 新建）

```java
package com.quill.agent.service.check;

import com.quill.agent.config.AgentYmlConfig;
import com.quill.agent.dto.CheckIssue;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 自检规则引擎（04 计划 D36）：幂等、纯函数、无外部 IO。
 * 词库/参数来自 AgentYmlConfig 的内存快照（check.* 节点）；
 * text 必须为纯文本投影（前端 editor.getText()），offset 为 UTF-16 code unit。
 */
@Component
public class CheckRuleEngine {

    /** 连续中日韩文字段（n-gram 只在此类段上统计，避免标点/空白 gram 噪音） */
    private static final Pattern CJK_RUN = Pattern.compile("[\\p{IsHan}\\p{IsHiragana}\\p{IsKatakana}]+");
    private static final Pattern SENT_SPLIT = Pattern.compile("[。！？!?；;]");

    private final AgentYmlConfig config;

    public CheckRuleEngine(AgentYmlConfig config) {
        this.config = config;
    }

    public List<CheckIssue> check(String genre, String text) {
        return switch (genre) {
            case "MEDIA" -> media(text);
            case "OFFICIAL" -> official(text);
            default -> novel(text);     // NOVEL 及未知文体兜底网文检规
        };
    }

    // —— NOVEL：敏感词 + 邻近重复（n-gram 词频窗口） ——
    private List<CheckIssue> novel(String text) {
        List<CheckIssue> issues = new ArrayList<>();
        for (String word : config.strList("check", "sensitive")) {
            for (int at = text.indexOf(word); at >= 0; at = text.indexOf(word, at + 1)) {
                issues.add(issue("SENSITIVE", "MAJOR", at, at + word.length(), text,
                        "平台敏感词，建议替换", null));
            }
        }
        issues.addAll(repeatWords(text));
        return issues;
    }

    /** 邻近重复：词长 gramMin~gramMax 的 n-gram，在 window 字窗口内出现 maxCount 次即标记（首次不标） */
    private List<CheckIssue> repeatWords(String text) {
        int gramMin = config.intVal(2, "check", "repeat", "gramMin");
        int gramMax = config.intVal(4, "check", "repeat", "gramMax");
        int window = config.intVal(200, "check", "repeat", "window");
        int maxCount = config.intVal(3, "check", "repeat", "maxCount");

        List<CheckIssue> issues = new ArrayList<>();
        Matcher runMatcher = CJK_RUN.matcher(text);
        while (runMatcher.find()) {
            String run = runMatcher.group();
            int runStart = runMatcher.start();
            for (int gram = gramMin; gram <= gramMax && gram <= run.length(); gram++) {
                // 记录每个 gram 的全部出现位置（含全局偏移）
                Map<String, List<Integer>> table = new HashMap<>();
                for (int i = 0; i + gram <= run.length(); i++) {
                    table.computeIfAbsent(run.substring(i, i + gram), k -> new ArrayList<>())
                         .add(runStart + i);
                }
                for (Map.Entry<String, List<Integer>> e : table.entrySet()) {
                    List<Integer> pos = e.getValue();
                    for (int i = 1; i < pos.size(); i++) {         // 首次出现不标
                        // 与上一次出现相距 window 内 → 计入邻近重复
                        if (pos.get(i) - pos.get(i - 1) <= window) {
                            int from = pos.get(i);
                            issues.add(issue("REPEAT_WORD", "MINOR", from, from + gram, text,
                                    "该词在近 " + window + " 字内重复出现，建议替换同义词或调整句式", null));
                            break;                                  // 每 gram 每词只报一次，防噪音
                        }
                    }
                }
            }
        }
        return issues;
    }

    // —— MEDIA：平淡词 ——
    private List<CheckIssue> media(String text) {
        List<CheckIssue> issues = new ArrayList<>();
        for (String word : config.strList("check", "flatWords")) {
            for (int at = text.indexOf(word); at >= 0; at = text.indexOf(word, at + 1)) {
                issues.add(issue("FLAT_WORD", "MINOR", at, at + word.length(), text,
                        "平淡词，建议删除或换成更具张力的表达", null));
            }
        }
        return issues;
    }

    // —— OFFICIAL：口语词 + 格式（段落超长 / 缺序号开头） ——
    private List<CheckIssue> official(String text) {
        List<CheckIssue> issues = new ArrayList<>();
        for (String word : config.strList("check", "informalWords")) {
            for (int at = text.indexOf(word); at >= 0; at = text.indexOf(word, at + 1)) {
                issues.add(issue("INFORMAL", "MINOR", at, at + word.length(), text,
                        "口语化表达，建议替换为书面语", null));
            }
        }
        issues.addAll(format(text));
        return issues;
    }

    private List<CheckIssue> format(String text) {
        int maxPara = config.intVal(300, "check", "format", "maxParagraphChars");
        List<CheckIssue> issues = new ArrayList<>();
        String[] paras = text.split("\n", -1);
        int offset = 0;
        boolean numberedOk = true;
        for (String p : paras) {
            if (!p.isBlank() && p.trim().length() > maxPara) {
                issues.add(issue("FORMAT", "MINOR", offset, offset + p.length(), text,
                        "段落过长（" + p.trim().length() + " 字），建议拆分或分条", null));
            }
            // 段落数 >= 3 时检查序号开头（一、|（一）|1. |(1)），只报第一条不满足（防噪音）
            if (paras.length >= 3 && !p.isBlank() && numberedOk
                    && !p.trim().matches("^[（(]?[一二三四五六七八九十0-9]{1,3}[)）]?[、.．]\\s*.*")) {
                issues.add(issue("FORMAT", "MINOR", offset, offset + Math.min(p.length(), 20), text,
                        "公文建议使用序号分段（如“一、”或“1.”），便于阅读与引用", null));
                numberedOk = false;
            }
            offset += p.length() + 1;   // +1 = 换行符本身
        }
        return issues;
    }

    /** 组装 issue：original 截取原词附近上下文（问题词本身 + 前后少量） */
    private CheckIssue issue(String type, String severity, int from, int to, String text,
                             String suggestion, String replacement) {
        int showFrom = Math.max(0, from - 10);
        int showTo = Math.min(text.length(), to + 10);
        return new CheckIssue(type, severity, from, to, text.substring(from, to),
                text.substring(showFrom, showTo), suggestion, replacement, null);
    }
}
```

### 1.6 DTO

**`backend/src/main/java/com/quill/agent/dto/CheckDtos.java`**

```java
package com.quill.agent.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.List;

/** 全文自检 DTO（02-接口文档 §2.7） */
public final class CheckDtos {

    private CheckDtos() {
    }

    /** 单条问题：offset 为纯文本投影上的 UTF-16 偏移 */
    public record CheckIssue(String type, String severity, Integer offsetStart, Integer offsetEnd,
                             String original, String suggestion, String replacement,
                             Integer sentenceIndex) {
    }

    /** 自检响应 data */
    public record CheckResponse(List<CheckIssue> issues, String summary) {
    }
}
```

### 1.7 验证

```powershell
cd [本地路径]
mvn -q -DskipTests compile
# 单测见 §6.1；纯函数性由同输入两次断言一致覆盖
```

---
