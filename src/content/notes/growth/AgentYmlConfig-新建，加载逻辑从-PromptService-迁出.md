---
title: "AgentYmlConfig（新建，加载逻辑从 PromptService 迁出）"
date: 2026-10-31
planet: growth
tags: ["QuillAgent", "文档", 1.3 AgentYmlConfig（新建，加载逻辑从 PromptService 迁出）, growth]
summary: "backend/src/main/java/com/quill/agent/config/AgentYmlConfig.java"
private: false
---

### 1.3 AgentYmlConfig（新建，加载逻辑从 PromptService 迁出）

**`backend/src/main/java/com/quill/agent/config/AgentYmlConfig.java`**

```java
package com.quill.agent.config;

import com.quill.agent.exception.BusinessException;
import com.quill.agent.exception.ErrorCode;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.yaml.snakeyaml.Yaml;

import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Collections;
import java.util.List;
import java.util.Map;

/**
 * agent.yml 统一配置加载（提示词 + 检规词库共用）：
 * 启动：用户配置缺失/损坏 → 回退 classpath 内置默认；
 * 重载：用户配置存在但损坏 → 保留旧配置并抛 ERR_CONFIG_001（回滚语义）；
 *       用户配置被删除 → 回退内置默认（恢复出厂）。
 */
@Component
public class AgentYmlConfig {

    private static final Logger log = LoggerFactory.getLogger(AgentYmlConfig.class);

    private final Path userConfig;
    private volatile Map<String, Object> map = Map.of();

    public AgentYmlConfig(@Value("${writer.data-dir}") String dataDir) {
        this.userConfig = Path.of(dataDir, "agent.yml");
    }

    @PostConstruct
    public void load() {
        Map<String, Object> loaded = readYaml(userConfig);
        if (loaded == null) {
            loaded = readClasspath();
            log.info("配置使用内置默认（{} 缺失或无法解析）", userConfig);
        } else {
            log.info("配置已从 {} 加载", userConfig);
        }
        this.map = loaded == null ? Map.of() : loaded;
    }

    /** 手动重载（设置页按钮触发；损坏回滚旧配置，缺失回退内置） */
    public synchronized void reload() {
        if (Files.isRegularFile(userConfig)) {
            Map<String, Object> loaded = readYaml(userConfig);
            if (loaded == null) {
                log.warn("agent.yml 解析失败，回滚旧配置：{}", userConfig);
                throw new BusinessException(ErrorCode.ERR_CONFIG_001);   // 保留旧 map 不动
            }
            this.map = loaded;
            log.info("配置已重载：{}", userConfig);
        } else {
            this.map = readClasspath();
            log.info("用户配置不存在，已回退内置默认");
        }
    }

    /** 按路径取任意节点（提示词 / 检规词库通用） */
    @SuppressWarnings("unchecked")
    public Object get(String... keys) {
        Object cur = map;
        for (String k : keys) {
            if (!(cur instanceof Map<?, ?> m)) return null;
            cur = m.get(k);
        }
        return cur;
    }

    public String str(String fallback, String... keys) {
        Object o = get(keys);
        return o == null ? fallback : String.valueOf(o).trim();
    }

    public int intVal(int fallback, String... keys) {
        Object o = get(keys);
        if (o instanceof Number n) return n.intValue();
        if (o instanceof String s) {
            try { return Integer.parseInt(s.trim()); } catch (NumberFormatException ignore) { }
        }
        return fallback;
    }

    @SuppressWarnings("unchecked")
    public List<String> strList(String... keys) {
        Object o = get(keys);
        if (o instanceof List<?> l) {
            return l.stream().map(String::valueOf).map(String::trim).filter(s -> !s.isEmpty()).toList();
        }
        return Collections.emptyList();
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> readYaml(Path path) {
        if (!Files.isRegularFile(path)) return null;
        try (InputStream in = Files.newInputStream(path)) {
            Object o = new Yaml().load(in);
            return o instanceof Map<?, ?> m ? (Map<String, Object>) m : null;
        } catch (Exception ex) {
            log.warn("agent.yml 解析失败：{}", ex.getMessage());
            return null;
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> readClasspath() {
        try (InputStream in = new ClassPathResource("agent-default.yml").getInputStream()) {
            Object o = new Yaml().load(in);
            return o instanceof Map<?, ?> m ? (Map<String, Object>) m : null;
        } catch (Exception ex) {
            log.error("内置默认配置加载失败", ex);
            return null;
        }
    }
}
```

### 1.4 PromptService 改造（删除自带 yml 逻辑，改依赖 AgentYmlConfig）

```java
@Component
public class PromptService {

    private final AgentYmlConfig config;

    public PromptService(AgentYmlConfig config) {
        this.config = config;
    }

    /** 手动重载（端点 /api/prompt-templates/reload 触发；失败抛 ERR_CONFIG_001） */
    public void reload() {
        config.reload();
    }

    // …… 以下方法签名不变，内部取数由私有 path() 改为 config.get()：
    // styleSystem / continueCommon / quickSystem / outlineSystem / inspireSystem：
    private Object path(String... keys) { return config.get(keys); }   // 替换原有实现
    // 删除原 @PostConstruct load() / readYaml / readClasspath / userConfig 字段
}
```
