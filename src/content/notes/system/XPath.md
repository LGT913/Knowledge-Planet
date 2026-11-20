---
title: "XPath"
date: 2023-09-26
planet: system
tags: ["Java", "基础", XPath, system]
summary: "Dom4J 可以用于解析整个 XML 的数据，但是如果要检索 XML 中的某些信息，建议使用 XPath"
private: false
---

### XPath

Dom4J 可以用于解析整个 XML 的数据，但是如果要检索 XML 中的某些信息，建议使用 XPath

XPath 常用API：

* List<Node> selectNodes(String var1) : 检索出一批节点集合
* Node selectSingleNode(String var1) : 检索出一个节点返回

XPath 提供的四种检索数据的写法：

1. 绝对路径：/根元素/子元素/子元素
2. 相对路径：./子元素/子元素 (.代表了当前元素)
3. 全文搜索：
   * //元素：在全文找这个元素
   * //元素1/元素2：在全文找元素1下面的一级元素 2
   *  //元素1//元素2：在全文找元素1下面的全部元素 2
4. 属性查找：
   * //@属性名称：在全文检索属性对象
   * //元素[@属性名称]：在全文检索包含该属性的元素对象
   * //元素[@属性名称=值]：在全文检索包含该属性的元素且属性值为该值的元素对象

```java
public class XPathDemo {
    public static void main(String[] args) throws Exception {
        SAXReader saxReader = new SAXReader();
        InputStream is = XPathDemo.class.getResourceAsStream("/Contact.xml");
        Document document = saxReader.read(is);
        //1.使用绝对路径定位全部的name名称
        List<Node> nameNodes1 = document.selectNodes("/contactList/contact/name");
        for (Node nameNode : nameNodes) {
            System.out.println(nameNode.getText());
        }
        
        //2.相对路径。从根元素开始检索，.代表很根元素
        List<Node> nameNodes2 = root.selectNodes("./contact/name");
        
        //3.1 在全文中检索name节点
        List<Node> nameNodes3 = root.selectNodes("//name");//全部的
        //3.2 在全文中检索所有contact下的所有name节点  //包括sql，不外面的
        List<Node> nameNodes3 = root.selectNodes("//contact//name");
        //3.3 在全文中检索所有contact下的直接name节点
        List<Node> nameNodes3 = root.selectNodes("//contact/name");//不包括sql和外面
        
        //4.1 检索全部属性对象
        List<Node> attributes1 = root.selectNodes("//@id");//包括sql4
        //4.2 在全文检索包含该属性的元素对象
        List<Node> attributes1 = root.selectNodes("//contact[@id]");
        //4.3 在全文检索包含该属性的元素且属性值为该值的元素对象
        Node nodeEle = document.selectSingleNode("//contact[@id=2]");
        Element ele = (Element)nodeEle;
        System.out.println(ele.elementTextTrim("name"));//xi
    }
}
```

```xml
<?xml version="1.0" encoding="UTF-8"?>
<contactList>
<contact id="1">
    <name>小白</name>
    <gender>女</gender>
    <email>[邮箱已隐藏]</email>
</contact>
<contact id="2">
    <name>小黑</name>
    <gender>男</gender>
    <email>[邮箱已隐藏]</email>
    <sql id="sql4">
        <name>sql语句</name>
    </sql>
</contact>
<contact id="3">
    <name>小虎</name>
    <gender>男</gender>
    <email>[邮箱已隐藏]</email>
</contact>
<contact></contact>
<name>外面的名称</name>
</contactList>
```





****
