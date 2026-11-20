---
title: "Dom4J"
date: 2023-09-26
planet: system
tags: ["Java", "基础", Dom4J, system]
summary: "XML 解析就是从 XML 中获取到数据，DOM 是解析思想"
private: false
---

### Dom4J

#### 解析

XML 解析就是从 XML 中获取到数据，DOM 是解析思想

DOM（Document Object Model）：文档对象模型，把文档的各个组成部分看做成对应的对象，把 XML 文件全部加载到内存，在内存中形成一个树形结构，再获取对应的值

Dom4J 实现：
* Dom4J 解析器构造方法：`SAXReader saxReader = new SAXReader()`

* SAXReader 常用 API：

  * `public Document read(File file)`：Reads a Document from the given File
  * `public Document read(InputStream in)`：Reads a Document from the given stream using SAX

* Java Class 类 API：
  
  * `public InputStream getResourceAsStream(String path)`：加载文件成为一个字节输入流返回



****



#### 根元素

Document 方法：`Element getRootElement()` 获取根元素

```java
// 需求：解析books.xml文件成为一个Document文档树对象，得到根元素对象。
public class Dom4JDemo {
    public static void main(String[] args) throws Exception {
        // 1.创建一个dom4j的解析器对象：代表整个dom4j框架。
        SAXReader saxReader = new SAXReader();
        // 2.第一种方式（简单）：通过解析器对象去加载xml文件数据，成为一个Document文档树对象。
        //Document document = saxReader.read(new File("Day13Demo/src/books.xml"));
        
        // 3.第二种方式（代码多点）先把xml文件读成一个字节输入流
        // 这里的“/”是直接去src类路径下寻找文件。
        InputStream is = Dom4JDemo01.class.getResourceAsStream("/books.xml");
        Document document = saxReader.read(is);
        System.out.println(document);
		//org.dom4j.tree.DefaultDocument@27a5f880 [Document: name null]
		// 4.从document文档树对象中提取根元素对象
        Element root = document.getRootElement();
        System.out.println(root.getName());//books
    }
}
```

```xml
<?xml version="1.0" encoding="UTF-8"?>
<books>
    <book id="0001" desc="第一本书">
        <name>  JavaWeb开发教程</name>
        <author>    张三</author>
        <sale>100.00元   </sale>
    </book>
    <book id="0002">
        <name>三国演义</name>
        <author>罗贯中</author>
        <sale>100.00元</sale>
    </book>
    <user>
    </user>
</books>

```



****



#### 子元素

Element 元素的 API:

* String getName()：取元素的名称。
* List<Element> elements()：获取当前元素下的全部子元素（一级）
* List<Element> elements(String name)：获取当前元素下的指定名称的全部子元素（一级）
* Element element(String name)：获取当前元素下的指定名称的某个子元素，默认取第一个（一级）

```java
public class Dom4JDemo {
    public static void main(String[] args) throws Exception {
        SAXReader saxReader = new SAXReader();
        Document document = saxReader.read(new File("Day13Demo/src/books.xml"));
        // 3.获取根元素对象
        Element root = document.getRootElement();
        System.out.println(root.getName());

        // 4.获取根元素下的全部子元素
        List<Element> sonElements = root.elements();
        for (Element sonElement : sonElements) {
            System.out.println(sonElement.getName());
        }
        // 5.获取根源下的全部book子元素
        List<Element> sonElements1 = root.elements("book");
        for (Element sonElement : sonElements1) {
            System.out.println(sonElement.getName());
        }
        
        // 6.获取根源下的指定的某个元素
        Element son = root.element("user");
        System.out.println(son.getName());
        // 默认会提取第一个名称一样的子元素对象返回！
        Element son1 = root.element("book");
        System.out.println(son1.attributeValue("id"));
    }
}

```



***



#### 属性

Element 元素的 API：

* List<Attribute> attributes()：获取元素的全部属性对象
* Attribute attribute(String name)：根据名称获取某个元素的属性对象
* String attributeValue(String var)：直接获取某个元素的某个属性名称的值

Attribute 对象的 API：

* String getName()：获取属性名称
* String getValue()：获取属性值

```java
public class Dom4JDemo {
    public static void main(String[] args) throws Exception {
        SAXReader saxReader = new SAXReader();
        Document document = saxReader.read(new File("Day13Demo/src/books.xml"));
        Element root = document.getRootElement();
        // 4.获取book子元素
        Element bookEle = root.element("book");

        // 5.获取book元素的全部属性对象
        List<Attribute> attributes = bookEle.attributes();
        for (Attribute attribute : attributes) {
            System.out.println(attribute.getName()+"->"+attribute.getValue());
        }

        // 6.获取Book元素的某个属性对象
        Attribute descAttr = bookEle.attribute("desc");
        System.out.println(descAttr.getName()+"->"+descAttr.getValue());

        // 7.可以直接获取元素的属性值
        System.out.println(bookEle.attributeValue("id"));
        System.out.println(bookEle.attributeValue("desc"));
    }
}
```



***



#### 文本

Element：

* String elementText(String name)：可以直接获取当前元素的子元素的文本内容
* String elementTextTrim(String name)：去前后空格,直接获取当前元素的子元素的文本内容
* String getText()：直接获取当前元素的文本内容
* String getTextTrim()：去前后空格,直接获取当前元素的文本内容

```java
public class Dom4JDemo {
    public static void main(String[] args) throws Exception {
        SAXReader saxReader = new SAXReader();
        Document document = saxReader.read(new File("Day13Demo/src/books.xml"));
        Element root = document.getRootElement();
        // 4.得到第一个子元素book
        Element bookEle = root.element("book");

        // 5.直接拿到当前book元素下的子元素文本值
        System.out.println(bookEle.elementText("name"));
        System.out.println(bookEle.elementTextTrim("name")); // 去前后空格
        System.out.println(bookEle.elementText("author"));
        System.out.println(bookEle.elementTextTrim("author")); // 去前后空格

        // 6.先获取到子元素对象，再获取该文本值
        Element bookNameEle = bookEle.element("name");
        System.out.println(bookNameEle.getText());
        System.out.println(bookNameEle.getTextTrim());// 去前后空格
    }
}
```





****
