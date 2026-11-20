---
title: "D38 前端：Decoration 标注 + 悬浮提示 + 一键替换"
date: 2026-10-31
planet: growth
tags: ["QuillAgent", "文档", 3. D38 前端：Decoration 标注 + 悬浮提示 + 一键替换, growth]
summary: "- 检规问题按 severity 标色下划线（TipTap Decoration，不侵入文档内容、不进撤销栈）。 - 点击高亮弹出悬浮卡片：原文 / 建议 / 【一键替换】；替换走 TipTap 事务（可撤销）。 - 前提能力：纯文本 of"
private: false
---

## 3. D38 前端：Decoration 标注 + 悬浮提示 + 一键替换

### 3.1 任务

- 检规问题按 severity 标色下划线（TipTap **Decoration**，不侵入文档内容、不进撤销栈）。
- 点击高亮弹出悬浮卡片：原文 / 建议 / 【一键替换】；替换走 **TipTap 事务**（可撤销）。
- 前提能力：**纯文本 offset ↔ ProseMirror position 映射**（03 §1.9）。

### 3.2 偏移映射与装饰模块

**`electron/src/editor/checkDecorations.ts`**（新建）

```ts
import { Plugin, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet, type EditorView } from 'prosemirror-view';
import { Extension } from '@tiptap/core';
import type { Editor } from '@tiptap/core';
import type { CheckIssue } from '../api/check';

export const checkPluginKey = new PluginKey('checkDecorations');

interface Run { textStart: number; docFrom: number }   // 纯文本段 → doc 位置

/**
 * 纯文本 offset → ProseMirror position 映射（03-生产规范 §1.9）：
 * 口径与 editor.getText()（textBetween 用 '\n' 分隔块）一致——
 * 每个 text node 一段；每个块的结束占一个分隔符，映射到块末尾。
 */
export function buildOffsetMapper(doc: { content: { size: number }, descendants: Function }): (offset: number) => number {
    const runs: Run[] = [];
    let textLen = 0;
    const walk = (node: any, pos: number, isRoot: boolean): void => {
        if (node.isText) {
            runs.push({ textStart: textLen, docFrom: pos });
            textLen += (node.text ?? '').length;
            return;
        }
        node.forEach((child: any, offset: number) => walk(child, pos + 1 + offset, false));
        if (node.type.isBlock && !isRoot) {
            runs.push({ textStart: textLen, docFrom: pos + node.nodeSize - 1 }); // 换行占位
            textLen += 1;
        }
    };
    walk(doc, 0, true);
    return (offset: number): number => {
        let lo = 0, hi = runs.length - 1, hit = 0;
        while (lo <= hi) {
            const mid = (lo + hi) >> 1;
            if (runs[mid].textStart <= offset) { hit = mid; lo = mid + 1; } else hi = mid - 1;
        }
        const r = runs[hit];
        return Math.min(doc.content.size, r.docFrom + Math.max(0, offset - r.textStart));
    };
}

/** 依据 issues 构建 DecorationSet（from 含、to 不含） */
export function buildDecorations(issues: CheckIssue[], map: (o: number) => number, size: number): DecorationSet {
    const decos = issues.map(issue => {
        const from = Math.min(size, map(issue.offsetStart));
        const to = Math.min(size, Math.max(from + 1, map(issue.offsetEnd) + 1));
        return Decoration.inline(from, Math.max(from + 1, to), {
            class: `check-hl check-hl-${issue.severity.toLowerCase()}`,
        });
    });
    return DecorationSet.create(size, decos);   // size = doc.content.size，仅作映射边界
}

export interface CheckHost {
    issues(): CheckIssue[];
    replaceIssue(issue: CheckIssue, from: number, to: number): void;
    clear(): void;
}

/**
 * 挂到编辑器的检查装饰插件：
 * - docChanged（用户编辑输入）→ 自动清空全部标记（v1.0 裁剪点：不做实时标红）
 * - 外部 setMeta(checkPluginKey, issues) → 重建装饰
 * - 点击 .check-hl → 展示悬浮卡片（原文/建议/一键替换）
 */
export function createCheckExtension(host: CheckHost) {
    return Extension.create({
        name: 'checkDecorations',
        addProseMirrorPlugins() {
            return [new Plugin({
                key: checkPluginKey,
                state: {
                    init: () => ({ issues: [] as CheckIssue[] } as CheckMeta),
                    apply(tr, old) {
                        const meta = tr.getMeta(checkPluginKey);
                        if (meta) return meta;
                        if (tr.docChanged) { host.clear(); return { issues: [] }; }
                        return old;
                    },
                },
                props: {
                    decorations(state) {
                        const meta = state[checkPluginKey].getState() as CheckMeta;
                        const map = buildOffsetMapper(state.doc);
                        return buildDecorations(meta.issues, map, state.doc.content.size);
                    },
                    handleClickOn(view, _pos, _node, _nodePos, event) {
                        const target = (event.target as HTMLElement).closest('.check-hl');
                        if (!target) return false;
                        showCheckPopup(view, target, host);
                        return true;
                    },
                },
            })];
        },
    });
}

interface CheckMeta { issues: CheckIssue[] }

/** 从头计算 issues 并推给插件（CheckPanel 调用） */
export function applyCheckIssues(editor: Editor, issues: CheckIssue[]): void {
    const tr = editor.state.tr.setMeta(checkPluginKey, { issues });
    editor.view.dispatch(tr);
}

/** 悬浮卡片：定位高亮 DOM，展示问题详情 + 替换按钮（一次性，点击它处关闭） */
let popupEl: HTMLDivElement | null = null;
function showCheckPopup(view: EditorView, target: HTMLElement, host: CheckHost) {
    const pos = view.posAtDOM(target, 0);
    const issue = host.issues().find(i => {
        const map = buildOffsetMapper(view.state.doc);
        const from = map(i.offsetStart);
        const to = map(i.offsetEnd);
        return pos >= from && pos <= to;
    });
    closePopup();
    if (!issue) return;

    popupEl = document.createElement('div');
    popupEl.className = 'check-popup';
    popupEl.innerHTML = `
      <div class="cp-type">${issue.type} · ${issue.severity}</div>
      <div class="cp-original">原文：${(issue.original ?? '').replace(/</g, '&lt;')}</div>
      <div class="cp-suggestion">建议：${(issue.suggestion ?? '')}</div>`;
    if (issue.replacement) {
        const btn = document.createElement('button');
        btn.className = 'cp-replace';
        btn.textContent = '一键替换';
        btn.onclick = () => {
            const map = buildOffsetMapper(view.state.doc);
            const from = map(issue.offsetStart);
            const to = Math.min(view.state.doc.content.size, map(issue.offsetEnd) + 1);
            host.replaceIssue(issue, from, to);
            closePopup();
        };
        popupEl!.appendChild(btn);
    }
    document.body.appendChild(popupEl);
    const rect = target.getBoundingClientRect();
    popupEl.style.left = `${rect.left}px`;
    popupEl.style.top = `${rect.bottom + 6}px`;
}
function closePopup() {
    popupEl?.remove();
    popupEl = null;
}
document.addEventListener('click', e => {
    if (popupEl && !(e.target as HTMLElement).closest('.check-hl') && !(e.target as HTMLElement).closest('.check-popup')) closePopup();
});
```

### 3.3 RichEditor 挂插件

**`electron/src/components/RichEditor.vue`** 修改（`useEditor` 的 extensions 追加）：

```ts
import { createCheckExtension, type CheckHost } from '../editor/checkDecorations';
import type { CheckIssue } from '../api/check';

// 检查状态放 WritingView 层共享（CheckPanel 与编辑器插件读写同一份）
defineExpose / props：由父组件注入 host（issues 响应式 ref 的读写代理）
```

由于插件需要与 `CheckPanel` 共享状态，推荐把自检状态提升到 Pinia（与 `editorStore` 并列）：

**`electron/src/stores/check.ts`**（新建）

```ts
import { defineStore } from 'pinia';
import type { CheckIssue } from '../api/check';

export const useCheckStore = defineStore('check', {
    state: () => ({
        issues: [] as CheckIssue[],
        summary: '',
        running: false,
    }),
    actions: {
        setResult(issues: CheckIssue[], summary: string) {
            this.issues = issues;
            this.summary = summary;
        },
        clear() {
            this.issues = [];
            this.summary = '';
        },
    },
});
```

**RichEditor.vue** 内：

```ts
import { useCheckStore } from '../stores/check';
const checkStore = useCheckStore();

const checkHost: CheckHost = {
    issues: () => checkStore.issues,
    replaceIssue(issue, from, to) {
        // 替换走 TipTap 事务（进撤销栈）；替换后该标记随 docChanged 自动清空 + 列表刷新
        editor.value?.chain().focus().insertContentAt({ from, to }, issue.replacement ?? '').run();
        checkStore.issues = checkStore.issues.filter(i => i !== issue);
    },
    clear: () => checkStore.clear(),
};

const editor = useEditor({
    extensions: [StarterKit, Placeholder.configure({ placeholder: '开始写作…' }),
                 createCheckExtension(checkHost)],
    // …… 其余不变
});
```

**样式（RichEditor.vue `<style>` 追加，需 :deep 穿透到 ProseMirror 内）**：

```css
.content :deep(.check-hl) { cursor: pointer; text-decoration-line: underline; text-decoration-style: wavy; }
.content :deep(.check-hl-minor) { text-decoration-color: #f0a020; background: rgba(240, 160, 32, .12); }
.content :deep(.check-hl-medium) { text-decoration-color: #e06c00; background: rgba(224, 108, 0, .12); }
.content :deep(.check-hl-major) { text-decoration-color: #d03050; background: rgba(208, 48, 80, .14); }
.check-popup {
  position: fixed; z-index: 3000; max-width: 320px; background: var(--el-bg-color);
  border: 1px solid var(--el-border-color); border-radius: 6px; box-shadow: var(--el-box-shadow-light);
  padding: 10px 12px; font-size: 13px;
}
.check-popup .cp-type { font-weight: 600; margin-bottom: 4px; }
.check-popup .cp-original { color: var(--el-text-color-secondary); margin-bottom: 4px; }
.check-popup .cp-suggestion { color: var(--el-text-color-regular); margin-bottom: 8px; }
.check-popup .cp-replace { cursor: pointer; }
```

> 说明：`check-hl` 是 **Decoration（视图层渲染）**，不是文档内容——撤销/导出/存版均不受污染；`docChanged` 清空标记即实现"编辑输入即清空全部标红"。

---
