---
title: "算法专题笔记：单调栈 + 二叉树BFS层序遍历"
date: 2026-10-03
planet: algorithm
tags: [算法]
summary: ""
private: false
---
> 格式统一：**题目信息 → 题意简述 → 核心思路 → 执行过程模拟 → 完整代码 → 通用模板 → 总结&易错点** 和之前二分、滑动窗口笔记格式完全对齐，可直接复制到md文件

------

# 第一部分 二叉树 BFS 层序遍历（Queue队列）

> 容器：`Queue<TreeNode> queue = new LinkedList<>()` 方法：`offer()`入队，`poll()`出队，`peek()`查看队首

## 例题1 LC102 二叉树的层序遍历

**题目信息**：给二叉树root，按从上到下、从左到右层序遍历，返回二维List，每个子List保存一层节点值。 示例：`root = [3,9,20,null,null,15,7]`，输出：`[[3],[9,20],[15,7]]`

### 题意简述

一层一层遍历二叉树，把每一层的节点值单独放到一个集合。

### 核心思路

1. BFS广度优先搜索，队列存放待访问的树节点。
2. `queue.size()` 在for循环**外部获取**，代表当前层节点总数。
3. for循环执行levelSize次，逐个弹出本层节点；收集节点值，把非空左右子节点入队。
4. for循环结束，本层收集完毕，加入最终结果。

### 手动执行模拟

树结构：3(左9，右20)；20(左15，右7)

1. queue=[3]，levelSize=1；弹出3，存入[3]；入队9、20；res=[[3]]
2. queue=[9,20]，levelSize=2；弹出9（无孩子），弹出20，入队15、7；res=[[3],[9,20]]
3. queue=[15,7]，levelSize=2；弹出15、7，无孩子；res=[[3],[9,20],[15,7]]
4. 队列为空结束。

### 完整代码

```java
class Solution {
    public List<List<Integer>> levelOrder(TreeNode root) {
        List<List<Integer>> res = new ArrayList<>();
        if(root == null) return res;
        Queue<TreeNode> queue = new LinkedList<>();
        queue.offer(root);

        while(!queue.isEmpty()){
            int levelSize = queue.size();
            List<Integer> level = new ArrayList<>();
            for(int i = 0; i < levelSize; i++){
                TreeNode cur = queue.poll();
                level.add(cur.val);
                if(cur.left != null) queue.offer(cur.left);
                if(cur.right != null) queue.offer(cur.right);
            }
            res.add(level);
        }
        return res;
    }
}
```

### BFS层序通用模板

```java
List<...> bfsTemplate(TreeNode root){
    List<...> res = new ArrayList<>();
    if(root == null) return res;
    Queue<TreeNode> queue = new LinkedList<>();
    queue.offer(root);
    while(!queue.isEmpty()){
        int levelSize = queue.size(); // 关键：锁定本层节点数量
        for(int i = 0; i < levelSize; i++){
            TreeNode cur = queue.poll();
            // 此处写对单个节点的处理逻辑

            if(cur.left != null) queue.offer(cur.left);
            if(cur.right != null) queue.offer(cur.right);
        }
        // for结束：本层全部处理完成，层级别操作（求平均、取末尾元素等）
    }
    return res;
}
```

### 总结&易错点

1. 适用题型：层序遍历、右视图、层平均值、Z字形遍历、二叉树最小深度。
2. ⚠️`levelSize`必须写在for外面，不能循环内调用`queue.size()`，队列会持续加入子节点。
3. 不要把null节点入队，入队前判`left != null`、`right != null`。
4. 衍生题只修改两处：节点内部处理、for循环结束后的层处理。

## 衍生例题 LC199 二叉树的右视图

**题目信息**：给定二叉树，返回从右侧看从上到下看到的节点值。 示例：`root=[1,2,3,null,5,null,4]`，输出`[1,3,4]`

### 思路

复用层序模板，**每层的最后一个节点即为右视图节点**，`i == levelSize‑1`收集val。

```java
public List<Integer> rightSideView(TreeNode root) {
    List<Integer> res = new ArrayList<>();
    if(root == null) return res;
    Queue<TreeNode> queue = new LinkedList<>();
    queue.offer(root);
    while(!queue.isEmpty()){
        int levelSize = queue.size();
        for(int i = 0; i < levelSize; i++){
            TreeNode cur = queue.poll();
            if(i == levelSize - 1){
                res.add(cur.val);
            }
            if(cur.left != null) queue.offer(cur.left);
            if(cur.right != null) queue.offer(cur.right);
        }
    }
    return res;
}
```

## 衍生例题 LC637 二叉树的层平均值

**题目信息**：返回每一层节点的平均值。 示例：`root = [3,9,20,null,null,15,7]`，输出`[3.0,14.5,11.0]`

### 思路

复用层序模板，本层循环累加sum，循环结束求平均。

```java
public List<Double> averageOfLevels(TreeNode root) {
    List<Double> res = new ArrayList<>();
    Queue<TreeNode> queue = new LinkedList<>();
    queue.offer(root);
    while(!queue.isEmpty()){
        int levelSize = queue.size();
        double sum = 0.0;
        for(int i = 0; i < levelSize; i++){
            TreeNode cur = queue.poll();
            sum += cur.val;
            if(cur.left != null) queue.offer(cur.left);
            if(cur.right != null) queue.offer(cur.right);
        }
        res.add(sum / levelSize);
    }
    return res;
}
```

------

# 第二部分 单调栈（Deque实现栈）

> 容器：`Deque<Integer> stack = new ArrayDeque<>()` 方法：`push()`压栈，`pop()`弹栈，`peek()`查看栈顶 单调栈核心：栈内存**下标**，维持栈内下标对应数值单调递增/递减，快速找到**左右最近比它小/大的元素**

## 例题1 LC84 柱状图中最大的矩形（单调递增栈）

**题目信息**：给定数组heights，每个元素代表柱子高度，柱子宽度为1，求可画出的最大矩形面积。 示例：`heights = [2,1,5,6,2,3]`，输出`10`。

### 题意简述

以某根柱子高度作为矩形高，向左右扩展，找到能扩展的最大宽度，计算面积，求全局最大。

### 核心思路

1. 使用**单调递增栈**（栈底到栈顶高度越来越大），栈存柱子下标。
2. 遇到当前高度 < 栈顶高度，破坏递增性质：弹出栈顶下标，计算以弹出元素为高的矩形：
   - 高 = `heights[popIdx]`
   - 右边界 = 当前i
   - 左边界 = 新栈顶下标；栈空则左边界取 `-1`
   - 宽度 = `i - left - 1`；面积 = 高 × 宽度
3. 直到栈重新维持递增，把当前i压栈。
4. 遍历结束，栈中剩余元素继续弹出计算（也可以在数组末尾补0简化）。

### 执行过程模拟 `heights=[2,1,5,6,2,3]`

- i=0 h=2，栈空，push 0；栈：[0]
- i=1 h=1 < heights[0]=2：弹出0；left=-1，w=1‑(-1)-1=1，面积=2；push1；栈：[1]
- i=2 h=5>1，push2；栈：[1,2]
- i=3 h=6>5，push3；栈：[1,2,3]
- i=4 h=2 <6：弹出3，w=4‑2‑1=1，面积6；h=2<5，弹出2，w=4‑1‑1=2，面积10；push4；栈：[1,4]
- i=5 h=3>2，push5；栈：[1,4,5]
- 循环结束，处理栈剩余元素，全部弹出计算；最终maxArea=10

### 完整代码

```java
class Solution {
    public int largestRectangleArea(int[] heights) {
        Deque<Integer> stack = new ArrayDeque<>();
        int maxArea = 0;
        int n = heights.length;
        for(int i = 0; i <= n; i++){
            int curH = (i == n) ? 0 : heights[i];
            while(!stack.isEmpty() && curH < heights[stack.peek()]){
                int popIdx = stack.pop();
                int h = heights[popIdx];
                int left = stack.isEmpty() ? -1 : stack.peek();
                int w = i - left - 1;
                maxArea = Math.max(maxArea, h * w);
            }
            stack.push(i);
        }
        return maxArea;
    }
}
```

### 单调栈通用模板（找左右第一个更小元素，递增栈）

```java
// i<=n，i=n时curH=0，强制清空栈
Deque<Integer> stack = new ArrayDeque<>();
for(int i = 0; i <= n; i++){
    int cur = (i == n) ? 哨兵值 : arr[i];
    while(!stack.isEmpty() && cur < arr[stack.peek()]){
        int idx = stack.pop();
        int left = stack.isEmpty() ? -1 : stack.peek();
        int right = i;
        // 根据题目计算结果（面积、距离等）
    }
    stack.push(i);
}
```

## 例题2 LC739 每日温度（单调递减栈）

**题目信息**：`temperatures`数组代表每日温度，返回数组answer：answer[i]表示第i天之后，要等待多少天才会出现更高温度；不存在填0。 示例：`temperatures = [73,74,75,71,69,72,76,73]`，输出`[1,1,4,2,1,1,0,0]`

### 题意简述

找每个元素**右边第一个比自己大的元素**，求下标差值。

### 核心思路

**单调递减栈**，栈存下标，栈底到栈顶温度递减。

- 当前温度 > 栈顶对应温度，破坏递减，弹出栈顶；当前i就是栈顶元素的“下一个更大”，计算下标差存入结果。
- 循环直到维持递减，压入当前i。

### 完整代码

```java
class Solution {
    public int[] dailyTemperatures(int[] temperatures) {
        int n = temperatures.length;
        int[] res = new int[n];
        Deque<Integer> stack = new ArrayDeque<>();
        for(int i = 0; i < n; i++){
            while(!stack.isEmpty() && temperatures[i] > temperatures[stack.peek()]){
                int idx = stack.pop();
                res[idx] = i - idx;
            }
            stack.push(i);
        }
        return res;
    }
}
```

### 总结&易错点

1. 单调递增栈：找**下一个更小元素**（84柱状图）
2. 单调递减栈：找**下一个更大元素**（739每日温度、496下一个更大元素）
3. ✅优先存下标，不要存数值，方便计算宽度/距离；
4. ✅栈空时左边界赋值 `-1`；
5. ✅可以末尾补哨兵0，强制弹出栈剩余元素，省去后续while循环；
6. ⚠️区分`>`和`>=`，重复元素会影响结果。

## 例题3 LC42 接雨水（补充，单调栈版本）

**题目信息**：height数组代表柱子高度，求总共可以接住雨水体积。 示例：`height = [0,1,0,2,1,0,1,3,2,1,2,1]`，输出`6`。

### 思路：单调递减栈，横向计算雨水

栈保存下标，栈内高度递减；遇到高于栈顶的柱子，弹出栈顶作为洼地底部，取左右挡板，计算一层雨水面积。

```java
class Solution {
    public int trap(int[] height) {
        Deque<Integer> stack = new ArrayDeque<>();
        int res = 0;
        int n = height.length;
        for(int i = 0; i < n; i++){
            while(!stack.isEmpty() && height[i] > height[stack.peek()]){
                int bottom = stack.pop();
                if(stack.isEmpty()) break;
                int left = stack.peek();
                int w = i - left - 1;
                int h = Math.min(height[left], height[i]) - height[bottom];
                res += w * h;
            }
            stack.push(i);
        }
        return res;
    }
}
```

### 单调栈题型判断口诀

> 求「左右最近第一个比当前大/小」，矩形、雨水、下一个更大元素 → 优先单调栈。

------

# 综合速查表

| 算法          | 使用容器          | 栈/队列特点             | 解题关键词             | 代表题目                  |
| ------------- | ----------------- | ----------------------- | ---------------------- | ------------------------- |
| 二叉树BFS层序 | Queue(LinkedList) | FIFO，提前锁定levelSize | 按层遍历、每层统计     | 102，199，637             |
| 单调递增栈    | Deque(ArrayDeque) | 栈内从底到顶递增        | 找下一个更小、矩形面积 | LC84柱状图最大矩形        |
| 单调递减栈    | Deque(ArrayDeque) | 栈内从底到顶递减        | 找下一个更大、接雨水   | LC739每日温度、LC42接雨水 |

> 配套笔记：二分查找、滑动窗口、本份BFS+单调栈。
