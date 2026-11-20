---
title: "算法&系统设计（多益一面手写，Java作答）"
date: 2026-09-16
planet: growth
tags: ["面试", "八股", 3.9 算法&系统设计（多益一面手写，Java作答）, growth]
summary: "推荐写法：压栈的时候，只有新元素小于等于min栈栈顶才压入最小值；出栈的时候，只有弹出元素等于min栈栈顶才pop min栈，减少冗余存储。"
private: false
---

## 3.9 算法&系统设计（多益一面手写，Java作答）

### A：O(1)获取最小值栈（大概率手写）

> 推荐写法：压栈的时候，只有新元素小于等于min栈栈顶才压入最小值；出栈的时候，**只有弹出元素等于min栈栈顶才pop min栈**，减少冗余存储。

```
import java.util.ArrayDeque;
import java.util.Deque;

public class MinStack {
    private final Deque<Integer> dataStack = new ArrayDeque<>();
    private final Deque<Integer> minStack = new ArrayDeque<>();

    public void push(int val) {
        dataStack.push(val);
        if(minStack.isEmpty() || val <= minStack.peek()){
            minStack.push(val);
        }
    }
    public void pop() {
        Integer top = dataStack.pop();
        if(top.equals(minStack.peek())){
            minStack.pop();
        }
    }
    public int top() {
        return dataStack.peek();
    }
    public int getMin() {
        return minStack.peek();
    }
}
```

### B：设计交战系统（多益经典设计题，写完代码主动补充线上游戏服务端问题）

```
class Unit {
    String name;
    int hp, atk, def, level, exp;
    int maxHp;

    public Unit(String name, int hp, int atk, int def) {
        this.name = name;
        this.hp = hp;
        this.maxHp = hp;
        this.atk = atk;
        this.def = def;
        this.level = 1;
        this.exp = 0;
    }

    //计算伤害，最低1点伤害
    public int calcDamage(Unit target) {
        return Math.max(1, this.atk - target.def);
    }

    public void takeDamage(int dmg) {
        hp = Math.max(0, hp - dmg);
    }

    public void addExp(int e) {
        exp += e;
        while (exp >= 10) {
            exp -= 10;
            level++;
            atk += 2;
            def += 1;
            maxHp += 5;
            System.out.println(name + "升级到:" + level);
        }
    }

    //战斗结束回血
    public void restoreHp() {
        hp = maxHp;
    }

    public boolean isAlive() {
        return hp > 0;
    }
}

class Battle {
    //回合制战斗
    public void fight(Unit player, Unit monster) {
        while (player.isAlive() && monster.isAlive()) {
            //玩家攻击怪物
            monster.takeDamage(player.calcDamage(monster));
            if (!monster.isAlive()) break;
            //怪物反击玩家
            player.takeDamage(monster.calcDamage(player));
        }
        //怪物死亡，玩家获得经验，战斗结束回血
        if (!monster.isAlive()) {
            player.addExp(5);
            player.restoreHp();
        }
    }
}
```

> ✅**写完之后口头补充（非常重要！！！）** 这个是简单内存模型，真实游戏服务端不能这么写：
>
> 1. 全部对象在内存，服务重启数据全部丢失；玩家Unit属性必须持久化数据库；
> 2. 当前fight是while循环阻塞线程；真实游戏战斗不能阻塞业务线程；要用**状态机驱动**，每一帧tick驱动战斗逻辑；
> 3. 多线程并发访问Unit对象，要处理线程安全；
> 4. 战斗结束，经验、血量变更，要事务落库；
> 5. 真实游戏还有技能、暴击、BUFF、战斗状态同步给客户端，服务端做校验防作弊。

### C：游戏商城设计（口头设计，不一定手写）

**核心思路：**

1. 数据表：商品表、库存表、订单表、交易记录；
2. 扣库存：数据库行锁原子扣减：`UPDATE item SET stock = stock - ? WHERE id = ? AND stock >= ?;`；通过update返回受影响行数判断库存不足；
3. 事务内生成订单；
4. 接口幂等：幂等key，防止重复下单；
5. 高并发场景：Redis Lua预扣库存；MQ异步生成订单落库；定时任务兜底回滚超时未支付库存；
6. 注意：库存不能只依赖Redis，数据库作为真相源，防止Redis故障库存错乱。

### D：权限系统（老师学生家长）

> 口头讲：基于RBAC；枚举权限集合；User对象持有权限集合；提供hasPerm校验；持久化数据库；新增删除权限直接操作集合。

## 3.10 C++相关被问到的标准应答（不要瞎编）

> 问题举例：指针、引用、智能指针、vector扩容、虚函数虚表、深浅拷贝。 **标准话术模板：** “我主力开发语言是Java，没有C++项目实战；理论层面我学习过这个概念：xxx；但是工程落地经验不足；我现在正在补齐C++基础，如果入职之后需要使用C++，我可以快速学习上手。”

------

# 四、面试临场应急手册

## 4.1 不会的题目怎么说（绝对不要瞎编！）

1. 完全没接触：

   > “这个知识点我实际项目没有落地过，理论层面我了解xxx（知道多少说多少），但是细节掌握不够，面试结束我会重点补齐这块内容。”

2. 有了解，记不清细节：

   > “这个我有学习过，但是具体细节我记忆不是特别清晰，我可以讲我理解的核心思路是……”

❌禁忌：不要天马行空编一套答案，游戏服务端面试官对底层很敏感，很容易识别。

## 4.2 高频坑避雷清单（面试前看一遍）

| 坑点                             | 正确回答核心                                                 |
| -------------------------------- | ------------------------------------------------------------ |
| 为什么不用synchronized做分布式锁 | synchronized是JVM单机锁，多实例无效；分布式要用Redis/ZK锁    |
| 先删缓存还是先更新DB             | Cache‑Aside：**先更新数据库，后删除缓存**，TTL兜底           |
| JWT能不能服务端踢人              | 纯JWT无状态做不到；需要Redis黑名单/账号禁用标记补救          |
| Redisson锁过期业务没跑完         | 没有指定leaseTime，看门狗自动续期；手动leaseTime看门狗不启动 |
| MQ重复消费                       | 必须业务幂等，不能假设消息只消费一次                         |
| Netty IO线程处理业务             | IO线程严禁阻塞；耗时业务丢业务线程池，否则全部连接卡顿       |
| 布隆过滤器                       | 只能新增不能删除；扩容不能先删旧过滤器，防止空窗拦截合法ID   |
| 线程池CallerRunsPolicy           | 任务交给调用线程执行，任务不丢；但是会阻塞调用者，IO线程不能用这个策略 |

## 4.3 面试过程表达小技巧（游戏服务端偏好）

1. 讲完Web博客技术，**尽量补一句迁移游戏服务端场景的思考**，弥补你没有游戏项目的短板；
2. 回答技术点，不只背结论，多说**权衡取舍**（什么场景选这个，代价是什么，风险点是什么），游戏服务端非常看重取舍；
3. 遇到设计题（交战系统、商城），写完基础代码，主动说出线上真实系统的缺陷和改进点，体现工程思维；
4. 被问C++，诚实说主语言Java，理论了解，正在补基础，不要硬写C++代码。
