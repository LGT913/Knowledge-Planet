---
title: "D39 前端：CheckPanel（自检入口 + 问题列表 + 跳转 + summary）"
date: 2026-10-31
planet: growth
tags: ["QuillAgent", "文档", 4. D39 前端：CheckPanel（自检入口 + 问题列表 + 跳转 + summary）, growth]
summary: "- 【全文自检】按钮 → 调 /api/ai/check（content = 纯文本投影 editor.getText）→ applyCheckIssues 标红 + 列表展示。 - 列表点击跳转定位（映射 offset → setText"
private: false
---

## 4. D39 前端：CheckPanel（自检入口 + 问题列表 + 跳转 + summary）

### 4.1 任务

- 【全文自检】按钮 → 调 `/api/ai/check`（content = 纯文本投影 `editor.getText()`）→ `applyCheckIssues` 标红 + 列表展示。
- 列表点击跳转定位（映射 offset → `setTextSelection`）；一键替换；summary 展示。
- 替换后标记自动清空（D38 插件逻辑），用户可重新自检。

### 4.2 代码

**`electron/src/api/check.ts`**（新建）

```ts
import http from './http';

export interface CheckIssue {
    type: string; severity: string; offsetStart: number; offsetEnd: number;
    original: string; suggestion?: string; replacement?: string; sentenceIndex?: number;
}
export interface CheckResult { issues: CheckIssue[]; summary: string }

export const checkApi = {
    run: (genre: string, content: string, modelConfig: unknown) =>
        http.post<CheckResult>('/api/ai/check', { genre, content, modelConfig }).then(r => r.data.data),
};
```

**`electron/src/components/CheckPanel.vue`**（新建，抽屉）

```vue
<template>
  <el-drawer v-model="visible" title="全文自检" size="420px">
    <div class="ck-actions">
      <el-button type="primary" :loading="running" @click="run">全文自检</el-button>
      <span class="ck-summary">{{ summary }}</span>
    </div>

    <el-empty v-if="ran && !issues.length" description="未发现问题" :image-size="60" />

    <div v-for="(it, i) in issues" :key="i" class="ck-item" @click="jump(it)">
      <div class="ck-head">
        <el-tag size="small" :type="SEV_TAG[it.severity]">{{ TYPE_LABELS[it.type] ?? it.type }}</el-tag>
        <span class="ck-original">{{ it.original }}</span>
      </div>
      <div class="ck-suggestion">{{ it.suggestion }}</div>
      <div class="ck-foot">
        <el-button v-if="it.replacement" link type="primary" size="small"
                   @click.stop="replace(it, i)">一键替换「{{ it.replacement }}」</el-button>
      </div>
    </div>
  </el-drawer>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { useEditorStore } from '../stores/editor';
import { useCheckStore } from '../stores/check';
import { loadModelSettings } from '../stores/settings';
import { applyCheckIssues, buildOffsetMapper } from '../editor/checkDecorations';
import { checkApi, type CheckIssue } from '../api/check';

const visible = defineModel<boolean>({ required: true });
const editorStore = useEditorStore();
const checkStore = useCheckStore();

const running = ref(false);
const ran = ref(false);
const issues = computed(() => checkStore.issues);
const summary = computed(() => checkStore.summary);

const TYPE_LABELS: Record<string, string> = {
    REPEAT_WORD: '重复用词', SENSITIVE: '敏感词', FLAT_WORD: '平淡词',
    INFORMAL: '口语化', FORMAT: '格式', FLAT_BEGIN: '开头平淡', LOGIC_GAP: '逻辑断层',
};
const SEV_TAG: Record<string, 'success' | 'warning' | 'danger'> = {
    MINOR: 'success', MEDIUM: 'warning', MAJOR: 'danger',
};

async function run() {
    const ed = editorStore.editor;
    if (!ed) return;
    running.value = true;
    try {
        const r = await checkApi.run(editorStore.genre, ed.getText(), loadModelSettings());
        ran.value = true;
        checkStore.setResult(r.issues, r.summary);
        applyCheckIssues(ed, r.issues);          // 一次校验 → 一次性生成 Decoration（04 计划标红裁剪点）
    } catch (e) {
        ElMessage.error(e instanceof Error ? e.message : '自检失败');
    } finally { running.value = false; }
}

/** 列表点击：offset → position → 选中定位 */
function jump(it: CheckIssue) {
    const ed = editorStore.editor;
    if (!ed) return;
    const map = buildOffsetMapper(ed.state.doc);
    const from = Math.min(ed.state.doc.content.size, map(it.offsetStart));
    const to = Math.min(ed.state.doc.content.size, Math.max(from + 1, map(it.offsetEnd) + 1));
    ed.commands.setTextSelection({ from, to });
    ed.commands.scrollIntoView();
}

/** 与 D38 host.replaceIssue 同口径：TipTap 事务替换 + 从列表移除（其余标记随 docChanged 清空） */
function replace(it: CheckIssue, index: number) {
    const ed = editorStore.editor;
    if (!ed || !it.replacement) return;
    const map = buildOffsetMapper(ed.state.doc);
    const from = Math.min(ed.state.doc.content.size, map(it.offsetStart));
    const to = Math.min(ed.state.doc.content.size, Math.max(from + 1, map(it.offsetEnd) + 1));
    ed.chain().focus().insertContentAt({ from, to }, it.replacement).run();
    checkStore.issues = checkStore.issues.filter((_, i2) => i2 !== index);
    ElMessage.success('已替换（可 Ctrl+Z 撤销）');
}
</script>

<style scoped>
.ck-actions { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
.ck-summary { font-size: 12px; color: var(--el-text-color-secondary); }
.ck-item { padding: 8px 10px; margin-bottom: 8px; border: 1px solid var(--el-border-color-lighter);
           border-radius: 6px; cursor: pointer; }
.ck-item:hover { border-color: var(--el-color-primary-light-5); }
.ck-head { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.ck-original { font-size: 13px; color: var(--el-text-color-primary); }
.ck-suggestion { font-size: 12px; color: var(--el-text-color-secondary); margin-bottom: 4px; }
.ck-foot { text-align: right; }
</style>
```

**写入页集成（WritingView.vue）**：工具栏【全文自检】按钮 + 抽屉：

```vue
<el-button type="warning" @click="checkOpen = true">全文自检</el-button>
<CheckPanel v-model="checkOpen" />
```

```ts
import CheckPanel from '../components/CheckPanel.vue';
const checkOpen = ref(false);
```

> `AiToolbox.vue` 中「检查」组的占位按钮（当前 disabled 自检 W6）同步改为 `@click="emit('openCheck')"` 或直接复用同一抽屉入口（消除占位文案）。

---

## 5. D40 配置收口：词库外部化 + 重载生效 + 损坏回滚

### 5.1 本日任务（大部分在 D36 已落地）

1. 词库/正则外部化 → **D36 已随 `check:` 节点完成**（敏感词/平淡词/口语词/参数全在 agent.yml）。
2. 设置页【重载配置】按钮 → **W5 已存在**，指向 `/api/prompt-templates/reload`。
3. 重载语义增强：`AgentYmlConfig.reload()` 已实现"损坏回滚旧配置 + `ERR_CONFIG_001`"；**验证**：改 agent.yml 加一个词条 → 点重载 → 立即生效；改坏 yml（删冒号）→ 点重载 → 提示 `ERR-CONFIG-001 配置文件解析失败，已回滚旧配置`，且现有词库仍生效。

### 5.2 前端重载失败提示（SettingsView.vue 微调）

```ts
async function reloadPrompts() {
    reloading.value = true;
    try {
        await templateApi.reload();
        ElMessage.success('配置已重载（提示词 + 检规词库立即生效）');
    } catch (e: any) {
        ElMessage.error(e?.response?.data?.message ?? '配置解析失败，已沿用旧配置');
    } finally { reloading.value = false; }
}
```

---
