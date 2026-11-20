---
title: "D33 后端：素材收藏 CRUD（`/api/materials`）"
date: 2026-10-31
planet: growth
tags: ["QuillAgent", "文档", 5. D33 后端：素材收藏 CRUD（`/api/materials`）, growth]
summary: "material 表 + /api/materials 增删改查（genre/kind/content/source 校验入库）；content 纯文本、不解析为指令（防注入红线）。"
private: false
---

## 5. D33 后端：素材收藏 CRUD（`/api/materials`）

### 5.1 任务

`material` 表 + `/api/materials` 增删改查（genre/kind/content/source 校验入库）；content 纯文本、**不解析为指令**（防注入红线）。

### 5.2 代码

**`backend/src/main/java/com/quill/agent/service/persistence/entity/Material.java`**

```java
package com.quill.agent.service.persistence.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;

/** 素材收藏（material 表，02-接口文档 §2.6）；content 为纯文本，永不解析为指令 */
@TableName("material")
public class Material {

    @TableId(type = IdType.AUTO)
    private Long id;
    /** NOVEL / MEDIA / OFFICIAL / CUSTOM */
    private String genre;
    /** QUOTE / CASE / PHRASE */
    private String kind;
    /** 纯文本（防注入红线：入库后只被原样回显/插入，不拼装进任何 prompt 指令位） */
    private String content;
    /** 来源/备忘，可选 */
    private String source;
    private String createdAt;
    private String updatedAt;

    public Material() {
    }

    public Material(String genre, String kind, String content, String source,
                    String createdAt, String updatedAt) {
        this.genre = genre;
        this.kind = kind;
        this.content = content;
        this.source = source;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getGenre() { return genre; }
    public void setGenre(String genre) { this.genre = genre; }
    public String getKind() { return kind; }
    public void setKind(String kind) { this.kind = kind; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }
    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }
    public String getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(String updatedAt) { this.updatedAt = updatedAt; }
}
```

**`backend/src/main/java/com/quill/agent/service/persistence/mapper/MaterialMapper.java`**

```java
package com.quill.agent.service.persistence.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.quill.agent.service.persistence.entity.Material;

/** material 表 Mapper */
public interface MaterialMapper extends BaseMapper<Material> {
}
```

**`backend/src/main/java/com/quill/agent/service/persistence/MaterialService.java`**

```java
package com.quill.agent.service.persistence;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.quill.agent.exception.BusinessException;
import com.quill.agent.exception.ErrorCode;
import com.quill.agent.service.persistence.entity.Material;
import com.quill.agent.service.persistence.mapper.MaterialMapper;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Set;

/** 素材收藏（02-接口文档 §2.6）：纯文本入库、按 genre 归档、长度与枚举校验 */
@Service
public class MaterialService {

    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");
    private static final Set<String> GENRES = Set.of("NOVEL", "MEDIA", "OFFICIAL", "CUSTOM");
    private static final Set<String> KINDS = Set.of("QUOTE", "CASE", "PHRASE");
    private static final int CONTENT_MAX = 5000;
    private static final int SOURCE_MAX = 200;

    private final MaterialMapper mapper;

    public MaterialService(MaterialMapper mapper) {
        this.mapper = mapper;
    }

    /** 列表：按 genre 精确过滤（可选）、时间倒序 */
    public List<Material> list(String genre) {
        QueryWrapper<Material> qw = new QueryWrapper<Material>().orderByDesc("id");
        if (genre != null && !genre.isBlank()) {
            qw.eq("genre", genre);
        }
        return mapper.selectList(qw);
    }

    public Material create(String genre, String kind, String content, String source) {
        String now = now();
        Material m = new Material(normalizeGenre(genre), normalizeKind(kind),
                validateContent(content), trimSource(source), now, now);
        mapper.insert(m);
        return m;
    }

    public Material update(Long id, String genre, String kind, String content, String source) {
        Material m = get(id);
        m.setGenre(normalizeGenre(genre));
        m.setKind(normalizeKind(kind));
        m.setContent(validateContent(content));
        m.setSource(trimSource(source));
        m.setUpdatedAt(now());
        mapper.updateById(m);
        return m;
    }

    public void delete(Long id) {
        get(id);
        mapper.deleteById(id);
    }

    private Material get(Long id) {
        Material m = mapper.selectById(id);
        if (m == null) {
            throw new BusinessException(ErrorCode.ERR_PARAM_001); // 02 未登记素材级错误码，沿用参数错误
        }
        return m;
    }

    private String validateContent(String content) {
        if (content == null || content.isBlank() || content.length() > CONTENT_MAX) {
            throw new BusinessException(ErrorCode.ERR_PARAM_001);
        }
        return content.trim();
    }

    private String normalizeGenre(String genre) {
        String g = genre == null || genre.isBlank() ? "NOVEL" : genre.trim().toUpperCase();
        return GENRES.contains(g) ? g : "NOVEL";
    }

    private String normalizeKind(String kind) {
        String k = kind == null || kind.isBlank() ? "PHRASE" : kind.trim().toUpperCase();
        return KINDS.contains(k) ? k : "PHRASE";
    }

    private String trimSource(String source) {
        if (source == null || source.isBlank()) return "";
        return source.trim().length() > SOURCE_MAX ? source.trim().substring(0, SOURCE_MAX) : source.trim();
    }

    private String now() {
        return LocalDateTime.now().format(FMT);
    }
}
```

**`backend/src/main/java/com/quill/agent/controller/MaterialController.java`**

```java
package com.quill.agent.controller;

import com.quill.agent.dto.ApiResponse;
import com.quill.agent.service.persistence.MaterialService;
import com.quill.agent.service.persistence.entity.Material;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** 素材收藏管理（02-接口文档 §2.6） */
@RestController
@RequestMapping("/api/materials")
public class MaterialController {

    private final MaterialService materialService;

    public MaterialController(MaterialService materialService) {
        this.materialService = materialService;
    }

    @GetMapping
    public ApiResponse<List<Material>> list(@RequestParam(required = false) String genre) {
        return ApiResponse.ok(materialService.list(genre));
    }

    @PostMapping
    public ApiResponse<Material> create(@Valid @RequestBody MaterialRequest req) {
        return ApiResponse.ok(materialService.create(req.genre(), req.kind(), req.content(), req.source()));
    }

    @PutMapping("/{id}")
    public ApiResponse<Material> update(@PathVariable Long id, @Valid @RequestBody MaterialRequest req) {
        return ApiResponse.ok(materialService.update(id, req.genre(), req.kind(), req.content(), req.source()));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        materialService.delete(id);
        return ApiResponse.ok();
    }

    public record MaterialRequest(
            String genre,
            String kind,
            @NotBlank(message = "content 不能为空") @Size(max = 5000, message = "素材过长") String content,
            @Size(max = 200, message = "来源过长") String source) {
    }
}
```

---
