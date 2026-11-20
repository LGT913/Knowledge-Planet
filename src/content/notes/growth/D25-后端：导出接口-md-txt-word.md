---
title: "D25 后端：导出接口（md / txt / word）"
date: 2026-11-03
planet: growth
tags: ["QuillAgent", "文档", 4. D25 后端：导出接口（md / txt / word）, growth]
summary: "- GET /api/documents/{id}/export?format=md|txt|word：   - txt / md：纯文本直出（UTF-8；txt 加 BOM 防 Windows 记事本乱码，md 不加）；   - word"
private: false
---

## 4. D25 后端：导出接口（md / txt / word）

### 4.1 任务

- `GET /api/documents/{id}/export?format=md|txt|word`：
  - txt / md：纯文本直出（UTF-8；**txt 加 BOM** 防 Windows 记事本乱码，md 不加）；
  - word：Apache POI（XWPF）生成 .docx，**仅结构化基础排版（标题层级 + 段落）**，不承诺复杂样式；
  - `Content-Disposition` 指定文件名（`filename*` UTF-8 编码支持中文；ASCII 兜底）。
- 非法 format → `ERR_PARAM_001`；POI 生成失败 → `ERR_INTERNAL_001`（用户可回退 txt/md）。
- POI 仅能生成 **.docx**，不支持旧版 `.doc`；需要旧格式时由 Word 另存（论文声明口径）。
- POI 同步生成大文档会占用请求线程（单机单用户可接受）；异步导出列为 v1.1 可选优化，不影响 v1.0 验收。

### 4.2 代码

**`DocumentService.java` 修改（工具方法权限与空安全）**：

```java
    /** HTML → 纯文本投影：去标签 + 实体反转义（导出 / diff / 自检共用入口；null 安全） */
    public static String toPlainText(String html) {
        if (html == null || html.isEmpty()) return "";
        String text = html.replaceAll("<[^>]*>", " ");
        return text.replace("&nbsp;", " ")
                .replace("&lt;", "<")
                .replace("&gt;", ">")
                .replace("&quot;", "\"")
                .replace("&#39;", "'")
                .replace("&amp;", "&");
    }
```

> 由 package-private 改为 `public`：导出、版本 diff 跨包复用不再受包结构限制。
> POI 生成异常不属于"文档不存在"，**不映射 ERR-DOC-001**（保持 02 §2.4 已登记的 ERR-INTERNAL-001）；若要细分"文档解析/生成失败"，按附录 B 可选增强新增 ERR-DOC-002（需同步 ErrorCode 与 02 文档）。

**`backend/src/main/java/com/quill/agent/service/persistence/ExportService.java`**（新建；复用 `DocumentService.toPlainText()` public 工具方法）

```java
package com.quill.agent.service.persistence;

import com.quill.agent.exception.BusinessException;
import com.quill.agent.exception.ErrorCode;
import com.quill.agent.service.persistence.entity.Document;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 文档导出（02-接口文档 §2.4）：纯本地转换，无网络/AI 调用。
 * word 仅基础标题层级 + 段落；POI 失败抛 ERR-INTERNAL-001，前端提示回退 txt/md。
 */
@Service
public class ExportService {

    private static final Pattern BLOCK = Pattern.compile(
            "(?is)<(h[1-6]|p|blockquote|li|pre|div)[^>]*>(.*?)</\\1>");

    private static final String DOCX_MEDIA_TYPE =
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

    private final DocumentService documentService;

    public ExportService(DocumentService documentService) {
        this.documentService = documentService;
    }

    public ExportResult export(Long id, String format) {
        Document doc = documentService.get(id);                  // ERR-DOC-001
        String name = sanitizeFileName(doc.getTitle());
        String plain = DocumentService.toPlainText(doc.getContent());
        return switch (format.trim().toLowerCase()) {
            case "txt" -> new ExportResult(name + ".txt", toTxt(plain), "text/plain;charset=UTF-8");
            case "md" -> new ExportResult(name + ".md", toMarkdown(doc.getContent()),
                    "text/markdown;charset=UTF-8");
            case "word" -> new ExportResult(name + ".docx", toDocx(doc.getContent()), DOCX_MEDIA_TYPE);
            default -> throw new BusinessException(ErrorCode.ERR_PARAM_001);
        };
    }

    /** txt：UTF-8 + BOM（Windows 记事本直接打开不乱码）；换行保持 \\n（Win10+ 记事本已兼容） */
    private byte[] toTxt(String plain) {
        byte[] body = plain.getBytes(StandardCharsets.UTF_8);
        byte[] bom = {(byte) 0xEF, (byte) 0xBB, (byte) 0xBF};
        byte[] out = new byte[bom.length + body.length];
        System.arraycopy(bom, 0, out, 0, bom.length);
        System.arraycopy(body, 0, out, bom.length, body.length);
        return out;
    }

    /** md：标题层级转 # 前缀，段落原样；不做复杂转换（计划：直出） */
    private byte[] toMarkdown(String html) {
        StringBuilder md = new StringBuilder();
        for (Block b : blocks(html)) {
            md.append(b.level > 0 ? "#".repeat(Math.min(b.level, 6)) + " " + b.text : b.text)
              .append("\n\n");
        }
        return md.toString().getBytes(StandardCharsets.UTF_8);
    }

    /** docx：POI XWPF 基础排版——h1~h3 映射 Heading1~3（POI 默认模板内置），其余正文段落 */
    private byte[] toDocx(String html) {
        try (XWPFDocument document = new XWPFDocument();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            for (Block b : blocks(html)) {
                XWPFParagraph p = document.createParagraph();
                if (b.level >= 1) {
                    p.setStyle("Heading" + Math.min(b.level, 3));
                }
                p.createRun().setText(b.text);
            }
            if (document.getParagraphs().isEmpty()) {
                document.createParagraph(); // 空文档也保证可打开
            }
            document.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new BusinessException(ErrorCode.ERR_INTERNAL_001);
        }
    }

    /** 块级解析：TipTap 输出为可预期的块标签，正则分割足够（v1.0 不做复杂排版） */
    private List<Block> blocks(String html) {
        List<Block> list = new ArrayList<>();
        Matcher m = BLOCK.matcher(html);
        while (m.find()) {
            String tag = m.group(1).toLowerCase();
            String text = DocumentService.toPlainText(m.group(2)).trim();
            if (text.isEmpty()) {
                continue; // 空段落仍应保留？v1.0 直出场景跳过，避免导出大量空行
            }
            list.add(new Block(tag.startsWith("h") && tag.length() == 2 ? tag.charAt(1) - '0' : 0, text));
        }
        return list;
    }

    /** Windows 非法文件名字符 + 控制字符清洗；超长截断；标题空则兜底 document */
    static String sanitizeFileName(String title) {
        String t = (title == null || title.isBlank()) ? "document" : title;
        t = t.replaceAll("[\\\\/:*?\"<>|\\p{Cntrl}]", "_").trim();
        return t.length() > 60 ? t.substring(0, 60) : t;
    }

    record Block(int level, String text) {
    }

    /** 导出产物：文件名 + 字节 + 媒体类型 */
    public record ExportResult(String fileName, byte[] bytes, String mediaType) {
    }
}
```

**`backend/src/main/java/com/quill/agent/controller/ExportController.java`**（新建）

```java
package com.quill.agent.controller;

import com.quill.agent.service.persistence.ExportService;
import com.quill.agent.service.persistence.ExportService.ExportResult;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

/** 文档导出（02-接口文档 §2.4）：直接回二进制流 + Content-Disposition 文件名 */
@RestController
@RequestMapping("/api/documents")
public class ExportController {

    private final ExportService exportService;

    public ExportController(ExportService exportService) {
        this.exportService = exportService;
    }

    @GetMapping("/{id}/export")
    public ResponseEntity<byte[]> export(@PathVariable Long id,
                                         @RequestParam(defaultValue = "md") String format) {
        ExportResult r = exportService.export(id, format);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, contentDisposition(r))
                .contentType(MediaType.parseMediaType(r.mediaType()))
                .body(r.bytes());
    }

    /** RFC 6266：文件名中文走 filename*（UTF-8 百分号编码），ASCII 兜底防注入 */
    private String contentDisposition(ExportResult r) {
        String asciiFallback = "document-" + r.fileName().replaceAll("[^A-Za-z0-9.]", "_");
        String encoded = URLEncoder.encode(r.fileName(), StandardCharsets.UTF_8).replace("+", "%20");
        return "attachment; filename=\"" + asciiFallback + "\"; filename*=UTF-8''" + encoded;
    }
}
```

> 注意：导出接口返回**原始二进制流**（不包 `ApiResponse` JSON）。业务错误（401/ERR-DOC-001 等）仍由 `GlobalExceptionHandler` 以 JSON 返回——前端按 `Content-Type` 区分（见 §5）。

---
