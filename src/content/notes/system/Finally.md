---
title: "Finally"
date: 2023-09-26
planet: system
tags: ["Java", "基础", Finally, system]
summary: "finally 的作用：可以在代码执行完毕以后进行资源的释放操作"
private: false
---

### Finally

用在捕获处理的异常格式中的，放在最后面

```java
try{
    // 可能出现异常的代码！
}catch(Exception e){
    e.printStackTrace();
}finally{
    // 无论代码是出现异常还是正常执行，最终一定要执行这里的代码！！
}
try: 1次。
catch：0-N次  (如果有finally那么catch可以没有!!)
finally: 0-1次
```

**finally 的作用**：可以在代码执行完毕以后进行资源的释放操作

资源：资源都是实现了 Closeable 接口的，都自带 close() 关闭方法

注意：如果在 finally 中出现了 return，会吞掉异常

```java
public class FinallyDemo {
    public static void main(String[] args) {
        System.out.println(chu());//一定会输出 finally,优先级比return高
    }

    public static int chu(){
        try{
            int a = 10 / 2 ;
            return a ;
        }catch (Exception e){
            e.printStackTrace();
            return -1;
        }finally {
            System.out.println("=====finally被执行");
            //return 111; // 不建议在finally中写return，会覆盖前面所有的return值!
        }
    }
    public static void test(){
        InputStream is = null;
        try{
            is = new FileInputStream("D:/cang.png");
        }catch (Exception e){
            e.printStackTrace();
        }finally {
            System.out.println("==finally被执行===");
            // 回收资源。用于在代码执行完毕以后进行资源的回收操作！
            try {
                if(is!=null)is.close();
            } catch (Exception e) {
                e.printStackTrace();
            }
        }
    }
}
```



***
