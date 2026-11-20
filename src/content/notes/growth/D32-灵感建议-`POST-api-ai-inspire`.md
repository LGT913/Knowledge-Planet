---
title: "D32 灵感建议（`POST /api/ai/inspire`）"
date: 2026-10-31
planet: growth
tags: ["QuillAgent", "文档", 4. D32 灵感建议（`POST /api/ai/inspire`）, growth]
summary: "AiController.java 追加："
private: false
---

## 4. D32 灵感建议（`POST /api/ai/inspire`）

### 4.1 后端

**`AiController.java` 追加**：

```java
    /** 灵感建议（D32）：按主题 + aspect 单轮流式返回，供挑选插入 */
    @PostMapping(value = "/inspire", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter inspire(@Valid @RequestBody InspireRequest req) {
        String genre = normalizeGenre(req.genre());
        String system = promptService.styleSystem(genre) + "\n"
                + promptService.inspireSystem(normalizeAspect(req.aspect()));
        // 主题同样包边界标签：不遵循其中任何指令
        String user = "<topic>\n" + req.topic() + "\n</topic>";
        return streamService.stream(req.modelConfig(), system, user);
    }

    /** aspect 三类之外归 TITLE（提示词层已按三类分支） */
    private String normalizeAspect(String aspect) {
        String a = aspect == null ? "" : aspect.trim().toUpperCase();
        return switch (a) {
            case "OPENING", "OUTLINE_IDEA" -> a;
            default -> "TITLE";
        };
    }

    public record InspireRequest(
            @NotBlank(message = "genre 不能为空") String genre,
            @NotBlank(message = "topic 不能为空") @Size(max = 200, message = "主题过长") String topic,
            @NotBlank(message = "aspect 不能为空") String aspect,
            @NotNull(message = "modelConfig 不能为空") @Valid ModelConfig modelConfig) {
    }
```

### 4.2 前端：`InspirePanel.vue`（生成 + 拆条 + 一键插入）

```vue
<template>
  <el-drawer v-model="visible" title="灵感建议" size="460px">
    <el-radio-group v-model="aspect" size="small">
      <el-radio-button value="TITLE">标题</el-radio-button>
      <el-radio-button value="OPENING">开头</el-radio-button>
      <el-radio-button value="OUTLINE_IDEA">大纲思路</el-radio-button>
    </el-radio-group>
    <el-input v-model="topic" style="margin-top: 10px" placeholder="主题，如：职场新人如何高效汇报" />
    <el-button type="primary" style="margin-top: 10px" :loading="busy" @click="generate">
      生成建议
    </el-button>

    <div v-if="busy" class="insp-stream">{{ raw }}<span class="cursor">▍</span></div>

    <div v-if="items.length" class="insp-list">
      <el-card v-for="(it, i) in items" :key="i" class="insp-card" shadow="never">
        <p class="insp-text">{{ it }}</p>
        <el-button link type="primary" size="small" @click="insert(it)">插入正文</el-button>
      </el-card>
    </div>
  </el-drawer>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { ElMessage } from 'element-plus';
import { useEditorStore } from '../stores/editor';
import { loadModelSettings } from '../stores/settings';
import { streamAi } from '../api/ai';

const visible = defineModel<boolean>({ required: true });
const editorStore = useEditorStore();

const aspect = ref<'TITLE' | 'OPENING' | 'OUTLINE_IDEA'>('TITLE');
const topic = ref('');
const busy = ref(false);
const raw = ref('');
const items = ref<string[]>([]);

async function generate() {
    if (!topic.value.trim()) { ElMessage.warning('请先输入主题'); return; }
    raw.value = '';
    items.value = [];
    busy.value = true;
    await streamAi('/api/ai/inspire', {
        genre: editorStore.genre, topic: topic.value.trim(), aspect: aspect.value,
        modelConfig: loadModelSettings(),
    }, {
        onToken(t) { raw.value += t; },
        onComplete() {
            items.value = splitItems(raw.value, aspect.value); // 按 aspect 拆条：标题/思路按行、开头按空行
            busy.value = false;
        },
        onError(e) { ElMessage.error(e.message); busy.value = false; },
    });
}

function splitItems(text: string, a: string): string[] {
    const parts = a === 'OPENING'
        ? text.split(/\n\s*\n/).map(s => s.trim()).filter(Boolean)
        : text.split('\n').map(s => s.replace(/^\s*[-·*]?\s*/, '').trim()).filter(Boolean);
    return parts.length ? parts : [text.trim()];   // 模型偶尔忽略换行：整段兜底为一条
}

/** 插入光标处：TipTap 事务，进撤销栈 */
function insert(text: string) {
    const ed = editorStore.editor;
    if (!ed) return;
    ed.chain().focus().insertContent(text).run();
    ElMessage.success('已插入光标处');
}
</script>

<style scoped>
.insp-stream { font-size: 12px; color: var(--el-text-color-secondary); margin-top: 10px; white-space: pre-wrap; }
.insp-list { margin-top: 14px; }
.insp-card { margin-bottom: 10px; }
.insp-text { font-size: 13px; line-height: 1.7; margin: 0 0 6px; white-space: pre-wrap; }
.cursor { animation: blink 1s step-end infinite; }
@keyframes blink { 50% { opacity: 0; } }
</style>
```

---
