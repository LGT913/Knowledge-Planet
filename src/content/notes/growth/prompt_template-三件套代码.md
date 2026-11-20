---
title: "prompt_template 三件套代码"
date: 2026-10-31
planet: growth
tags: ["QuillAgent", "文档", 1.6 prompt_template 三件套代码, growth]
summary: "backend/src/main/java/com/quill/agent/service/persistence/entity/PromptTemplate.java"
private: false
---

### 1.6 prompt_template 三件套代码

**`backend/src/main/java/com/quill/agent/service/persistence/entity/PromptTemplate.java`**

```java
package com.quill.agent.service.persistence.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;

/** 提示词模板（prompt_template 表，02-接口文档 §2.5）；isSystem=true 为内置只读资源 */
@TableName("prompt_template")
public class PromptTemplate {

    @TableId(type = IdType.AUTO)
    private Long id;
    private String name;
    private String prompt;
    /** NOVEL / MEDIA / OFFICIAL / CUSTOM */
    private String genre;
    /** WRITE / SUMMARY / MAIL / OTHER */
    private String category;
    private Boolean isSystem;
    /** ISO-8601 文本 */
    private String createdAt;

    public PromptTemplate() {
    }

    public PromptTemplate(String name, String prompt, String genre, String category,
                          boolean isSystem, String createdAt) {
        this.name = name;
        this.prompt = prompt;
        this.genre = genre;
        this.category = category;
        this.isSystem = isSystem;
        this.createdAt = createdAt;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getPrompt() { return prompt; }
    public void setPrompt(String prompt) { this.prompt = prompt; }
    public String getGenre() { return genre; }
    public void setGenre(String genre) { this.genre = genre; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public Boolean getIsSystem() { return isSystem; }
    public void setIsSystem(Boolean isSystem) { this.isSystem = isSystem; }
    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }
}
```

**`backend/src/main/java/com/quill/agent/service/persistence/mapper/PromptTemplateMapper.java`**

```java
package com.quill.agent.service.persistence.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.quill.agent.service.persistence.entity.PromptTemplate;

/** prompt_template 表 Mapper */
public interface PromptTemplateMapper extends BaseMapper<PromptTemplate> {
}
```

**`backend/src/main/java/com/quill/agent/service/persistence/PromptTemplateService.java`**

```java
package com.quill.agent.service.persistence;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.quill.agent.exception.BusinessException;
import com.quill.agent.exception.ErrorCode;
import com.quill.agent.service.persistence.entity.PromptTemplate;
import com.quill.agent.service.persistence.mapper.PromptTemplateMapper;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Set;

/**
 * 提示词模板（02-接口文档 §2.5）：
 * 内置三套文体模板（isSystem=true，只读）；用户自定义模板可增删改。
 * 红线：prompt 不含密钥；入库前校验长度与枚举。
 */
@Service
public class PromptTemplateService {

    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");
    private static final Set<String> GENRES = Set.of("NOVEL", "MEDIA", "OFFICIAL", "CUSTOM");
    private static final Set<String> CATEGORIES = Set.of("WRITE", "SUMMARY", "MAIL", "OTHER");
    private static final int NAME_MAX = 100;
    private static final int PROMPT_MAX = 5000;

    private final PromptTemplateMapper mapper;

    public PromptTemplateService(PromptTemplateMapper mapper) {
        this.mapper = mapper;
    }

    /** 内置种子（幂等）：仅空表时插入，与 agent.yml style 三套总纲呼应 */
    @PostConstruct
    public void seed() {
        if (mapper.selectCount(null) > 0) return;
        String now = now();
        mapper.insert(new PromptTemplate("网文写作模板",
                "你正在创作网文小说：围绕要点展开正文，画面感强、节奏紧凑，多用动作与细节描写。",
                "NOVEL", "WRITE", true, now));
        mapper.insert(new PromptTemplate("自媒体文章模板",
                "你正在撰写自媒体文章：口语化、有观点、有案例，段落短小，开头三行给足钩子。",
                "MEDIA", "WRITE", true, now));
        mapper.insert(new PromptTemplate("公文写作模板",
                "你正在撰写公文：表述严谨、结构清晰、用词规范，不用第一人称与口语，不虚构文号数据。",
                "OFFICIAL", "WRITE", true, now));
    }

    /** 列表：内置在前（id 升序=种子先插），可选 genre 精确过滤 */
    public List<PromptTemplate> list(String genre) {
        QueryWrapper<PromptTemplate> qw = new QueryWrapper<PromptTemplate>().orderByAsc("id");
        if (genre != null && !genre.isBlank()) {
            qw.eq("genre", genre);
        }
        return mapper.selectList(qw);
    }

    /** 新建/更新（02 §2.5 POST 语义）：内置模板只读，拒绝任何写入 */
    public PromptTemplate upsert(Long id, String name, String prompt, String genre, String category) {
        if (name == null || name.isBlank() || name.length() > NAME_MAX) {
            throw new BusinessException(ErrorCode.ERR_PARAM_001);
        }
        if (prompt == null || prompt.isBlank() || prompt.length() > PROMPT_MAX) {
            throw new BusinessException(ErrorCode.ERR_PARAM_001);
        }
        String g = genre == null || genre.isBlank() ? "NOVEL" : genre.trim().toUpperCase();
        if (!GENRES.contains(g)) {
            throw new BusinessException(ErrorCode.ERR_PARAM_001);
        }
        String c = category == null || category.isBlank() ? "OTHER" : category.trim().toUpperCase();
        if (!CATEGORIES.contains(c)) {
            throw new BusinessException(ErrorCode.ERR_PARAM_001);
        }
        if (id != null) {
            PromptTemplate t = requireEditable(id);
            t.setName(name.trim());
            t.setPrompt(prompt.trim());
            t.setGenre(g);
            t.setCategory(c);
            mapper.updateById(t);
            return t;
        }
        PromptTemplate t = new PromptTemplate(name.trim(), prompt.trim(), g, c, false, now());
        mapper.insert(t);
        return t;
    }

    /** 删除：内置只读；自定义直接删 */
    public void delete(Long id) {
        requireEditable(id);
        mapper.deleteById(id);
    }

    private PromptTemplate requireEditable(Long id) {
        PromptTemplate t = mapper.selectById(id);
        if (t == null) {
            throw new BusinessException(ErrorCode.ERR_PARAM_001);
        }
        if (Boolean.TRUE.equals(t.getIsSystem())) {
            throw new BusinessException(ErrorCode.ERR_PARAM_001);
        }
        return t;
    }

    private String now() {
        return LocalDateTime.now().format(FMT);
    }
}
```

**`backend/src/main/java/com/quill/agent/controller/PromptTemplateController.java`**

```java
package com.quill.agent.controller;

import com.quill.agent.dto.ApiResponse;
import com.quill.agent.service.persistence.PromptTemplateService;
import com.quill.agent.service.persistence.entity.PromptTemplate;
import com.quill.agent.service.prompt.PromptService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** 文体模板 / 提示词模板（02-接口文档 §2.5） */
@RestController
@RequestMapping("/api/prompt-templates")
public class PromptTemplateController {

    private final PromptTemplateService templateService;
    private final PromptService promptService;

    public PromptTemplateController(PromptTemplateService templateService, PromptService promptService) {
        this.templateService = templateService;
        this.promptService = promptService;
    }

    /** 模板列表（可选按文体过滤） */
    @GetMapping
    public ApiResponse<List<PromptTemplate>> list(@RequestParam(required = false) String genre) {
        return ApiResponse.ok(templateService.list(genre));
    }

    /** 新建/更新（id 可选；内置模板只读） */
    @PostMapping
    public ApiResponse<PromptTemplate> upsert(@Valid @RequestBody UpsertRequest req) {
        return ApiResponse.ok(templateService.upsert(req.id(), req.name(), req.prompt(),
                req.genre(), req.category()));
    }

    /** 删除（内置模板只读） */
    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        templateService.delete(id);
        return ApiResponse.ok();
    }

    /** 手动重载 agent.yml 提示词（无文件监听；设置页按钮触发） */
    @PostMapping("/reload")
    public ApiResponse<Void> reload() {
        promptService.reload();
        return ApiResponse.ok();
    }

    public record UpsertRequest(
            Long id,
            @NotBlank(message = "name 不能为空") @Size(max = 100, message = "名称过长") String name,
            @NotBlank(message = "prompt 不能为空") @Size(max = 5000, message = "提示词过长") String prompt,
            String genre,
            String category) {
    }
}
```

### 1.7 验证

```powershell
cd [本地路径]
mvn -q -DskipTests compile
```

---
