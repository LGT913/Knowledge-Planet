---
title: "Broker"
date: 2023-09-26
planet: system
tags: ["Java", "基础", Broker, system]
summary: "MappedFile 类是最基础的存储类，继承自 ReferenceResource 类，用来保证线程安全"
private: false
---

### Broker

#### MappedFile

##### 成员属性

MappedFile 类是最基础的存储类，继承自 ReferenceResource 类，用来**保证线程安全**

MappedFile 类成员变量：

* 内存相关：

  ```java
  public static final int OS_PAGE_SIZE = 1024 * 4;// 内存页大小：默认是 4k
  private AtomicLong TOTAL_MAPPED_VIRTUAL_MEMORY;	// 当前进程下所有的 mappedFile 占用的总虚拟内存大小
  private AtomicInteger TOTAL_MAPPED_FILES;		// 当前进程下所有的 mappedFile 个数
  ```

* 数据位点：

  ```java
  protected final AtomicInteger wrotePosition;	// 当前 mappedFile 的数据写入点
  protected final AtomicInteger committedPosition;// 当前 mappedFile 的数据提交点
  private final AtomicInteger flushedPosition;	// 数据落盘位点，在这之前的数据是持久化的安全数据
  												// flushedPosition-wrotePosition 之间的数据属于脏页
  ```

* 文件相关：CL 是 CommitLog，CQ 是 ConsumeQueue

  ```java
  private String fileName;	// 文件名称，CL和CQ文件名是【第一条消息的物理偏移量】，索引文件是【年月日时分秒】
  private long fileFromOffset;// 文件名转long，代表该对象的【起始偏移量】	
  private File file;			// 文件对象
  ```

  **MF 中以物理偏移量作为文件名，可以更好的寻址和进行判断**

* 内存映射：

  ```java
  protected FileChannel fileChannel;			// 文件通道
  private MappedByteBuffer mappedByteBuffer;	// 内存映射缓冲区，访问虚拟内存
  ```

ReferenceResource 类成员变量：

* 引用数量：当 `refCount <= 0` 时，表示该资源可以释放了，没有任何其他程序依赖它了，用原子类保证线程安全

  ```java
  protected final AtomicLong refCount = new AtomicLong(1);	// 初始值为 1
  ```

* 存活状态：表示资源的存活状态

  ```java
  protected volatile boolean available = true;
  ```

* 是否清理：默认值 false，当执行完子类对象的 cleanup() 清理方法后，该值置为 true ，表示资源已经全部释放

  ```java
  protected volatile boolean cleanupOver = false;
  ```

* 第一次关闭资源的时间：用来记录超时时间

  ```java
  private volatile long firstShutdownTimestamp = 0;
  ```

  

***



##### 成员方法

MappedFile 类核心方法：

* appendMessage()：提供上层向内存映射中追加消息的方法，消息如何追加由 AppendMessageCallback 控制

  ```java
  // 参数一：消息     参数二：追加消息回调
  public AppendMessageResult appendMessage(MessageExtBrokerInner msg, AppendMessageCallback cb)
  ```

  ```java
  // 将字节数组写入到文件通道
  public boolean appendMessage(final byte[] data)
  ```

* flush()：刷盘接口，参数 flushLeastPages  代表刷盘的最小页数 ，等于 0 时属于强制刷盘；> 0 时需要脏页（计算方法在数据位点）达到该值才进行物理刷盘；文件写满时强制刷盘

  ```java
  public int flush(final int flushLeastPages)
  ```

* selectMappedBuffer()：该方法以 pos 为开始位点 ，到有效数据为止，创建一个切片 ByteBuffer 作为数据副本，供业务访问数据

  ```java
  public SelectMappedBufferResult selectMappedBuffer(int pos)
  ```

* destroy()：销毁映射文件对象，并删除关联的系统文件，参数是强制关闭资源的时间

  ```java
  public boolean destroy(final long intervalForcibly)
  ```

* cleanup()：**释放堆外内存**，更新总虚拟内存和总内存映射文件数

  ```java
  public boolean cleanup(final long currentRef)
  ```

* warmMappedFile()：内存预热，当要新建的 MappedFile 对象大于 1g 时执行该方法。mappedByteBuffer 已经通过mmap映射，此时操作系统中只是记录了该文件和该 Buffer 的映射关系，而并没有映射到物理内存中，对该 MappedFile 的每个 Page Cache 进行写入一个字节分配内存，**将映射文件全部加载到内存**

  ```java
  public void warmMappedFile(FlushDiskType type, int pages)
  ```

* mlock()：锁住指定的内存区域避免被操作系统调到 swap 空间，减少了缺页异常的产生

  ```java
  public void mlock()
  ```

  swap space 是磁盘上的一块区域，可以是一个分区或者一个文件或者是组合。当系统物理内存不足时，Linux 会将内存中不常访问的数据保存到 swap 区域上，这样系统就可以有更多的物理内存为各个进程服务，而当系统需要访问 swap 上存储的内容时，需要通过**缺页中断**将 swap 上的数据加载到内存中

ReferenceResource 类核心方法：

* hold()：增加引用记数 refCount，方法加锁

  ```java
  public synchronized boolean hold()
  ```

* shutdown()：关闭资源，参数代表强制关闭资源的时间间隔

  ```java
  // 系统当前时间 - firstShutdownTimestamp 时间  > intervalForcibly 进行【强制关闭】
  public void shutdown(final long intervalForcibly)
  ```

* release()：引用计数减 1，当 refCount  为 0 时，调用子类的 cleanup 方法

  ```java
  public void release()
  ```






***



#### MapQueue

##### 成员属性

MappedFileQueue 用来管理 MappedFile 文件

成员变量：

* 管理目录：CommitLog 是 `../store/commitlog`， ConsumeQueue 是 `../store/xxx_topic/0`

  ```java
  private final String storePath;
  ```

* 文件属性：

  ```java
  private final int mappedFileSize;	// 目录下每个文件大小，CL文件默认 1g，CQ文件 默认 600w字节
  private final CopyOnWriteArrayList<MappedFile> mappedFiles;	//目录下的每个 mappedFile 都加入该集合
  ```

* 数据位点：

  ```java
  private long flushedWhere = 0;		// 目录的刷盘位点，值为 mf.fileName + mf.wrotePosition
  private long committedWhere = 0;	// 目录的提交位点
  ```

* 消息存储：

  ```java
  private volatile long storeTimestamp = 0;	// 当前目录下最后一条 msg 的存储时间
  ```

* 创建服务：新建 MappedFile 实例，继承自 ServiceThread 是一个任务对象，run 方法用来创建实例

  ```java
  private final AllocateMappedFileService allocateMappedFileService;
  ```



***



##### 成员方法

核心方法：

* load()：Broker 启动时，加载本地磁盘数据，该方法读取 storePath 目录下的文件，创建 MappedFile 对象放入集合内

  ```java
  public boolean load()
  ```

* getLastMappedFile()：获取当前正在顺序写入的 MappedFile 对象，如果最后一个 MappedFile 写满了，或者不存在 MappedFile 对象，则创建新的 MappedFile

  ```java
  // 参数一：文件起始偏移量；参数二：当list为空时，是否新建 MappedFile
  public MappedFile getLastMappedFile(final long startOffset, boolean needCreate)
  ```

* flush()：根据 flushedWhere 属性查找合适的 MappedFile，调用该 MappedFile 的落盘方法，并更新全局的 flushedWhere

  ```java
  //参数：0 表示强制刷新， > 0 脏页数据必须达到 flushLeastPages 才刷新
  public boolean flush(final int flushLeastPages)
  ```

* findMappedFileByOffset()：根据偏移量查询对象

  ```java
  public MappedFile findMappedFileByOffset(final long offset, final boolean returnFirstOnNotFound)
  ```

* deleteExpiredFileByTime()：CL 删除过期文件，根据文件的保留时长决定是否删除

  ```java
  // 参数一：过期时间； 参数二：删除两个文件之间的时间间隔； 参数三：mf.destory传递的参数； 参数四：true 强制删除
  public int deleteExpiredFileByTime(final long expiredTime,final int deleteFilesInterval, final long intervalForcibly, final boolean cleanImmediately)
  ```

* deleteExpiredFileByOffset()：CQ 删除过期文件，遍历每个 MF 文件，获取当前文件最后一个数据单元的物理偏移量，小于 offset 说明当前 MF 文件内都是过期数据

  ```java
  // 参数一：consumeLog 目录下最小物理偏移量，就是第一条消息的 offset； 
  // 参数二：ConsumerQueue 文件内每个数据单元固定大小
  public int deleteExpiredFileByOffset(long offset, int unitSize)
  ```






***



#### CommitLog

##### 成员属性

成员变量：

* 魔数：

  ```java
  public final static int MESSAGE_MAGIC_CODE = -626843481;	// 消息的第一个字段是大小，第二个字段就是魔数	
  protected final static int BLANK_MAGIC_CODE = -875286124;	// 文件尾消息的魔法值
  ```

* MappedFileQueue：用于管理 `../store/commitlog` 目录下的文件

  ```java
  protected final MappedFileQueue mappedFileQueue;
  ```

* 存储服务：

  ```java
  protected final DefaultMessageStore defaultMessageStore;	// 存储模块对象，上层服务
  private final FlushCommitLogService flushCommitLogService;	// 刷盘服务，默认实现是异步刷盘
  ```

* 回调器：控制消息的哪些字段添加到 MappedFile

  ```java
  private final AppendMessageCallback appendMessageCallback;
  ```

* 队列偏移量字典表：key 是主题队列 id，value 是偏移量

  ```java
  protected HashMap<String, Long> topicQueueTable = new HashMap<String, Long>(1024);
  ```

* 锁相关：

  ```java
  private volatile long beginTimeInLock = 0;		 	// 写数据时加锁的开始时间
  protected final PutMessageLock putMessageLock;		// 写锁，两个实现类：自旋锁和重入锁
  ```
  
  因为发送消息是需要持久化的，在 Broker 端持久化时会获取该锁，**保证发送的消息的线程安全**

构造方法：

* 有参构造：

  ```java
  public CommitLog(final DefaultMessageStore defaultMessageStore) {
      // 创建 MappedFileQueue 对象
      // 参数1：../store/commitlog； 参数2：【1g】； 参数3：allocateMappedFileService
      this.mappedFileQueue = new MappedFileQueue(...);
      // 默认 异步刷盘，创建这个对象
     	this.flushCommitLogService = new FlushRealTimeService();
      // 控制消息哪些字段追加到 mappedFile，【消息最大是 4M】
     	this.appendMessageCallback = new DefaultAppendMessageCallback(...);
      // 默认使用自旋锁
      this.putMessageLock = ...;
  }
  ```

  

***



##### 成员方法

CommitLog 类核心方法：

* start()：会启动刷盘服务

  ```java
  public void start()
  ```

* shutdown()：关闭刷盘服务

  ```java
  public void shutdown()
  ```

* load()：加载 CommitLog 目录下的文件

  ```java
  public boolean load()
  ```

* getMessage()：根据 offset 查询单条信息，返回的结果对象内部封装了一个 ByteBuffer，该 Buffer 表示 `[offset, offset + size]` 区间的 MappedFile 的数据

  ```java
  public SelectMappedBufferResult getMessage(final long offset, final int size)
  ```

* deleteExpiredFile()：删除过期文件，方法由 DefaultMessageStore 的定时任务调用

  ```java
  public int deleteExpiredFile()
  ```

* asyncPutMessage()：**存储消息**

  ```java
  public CompletableFuture<PutMessageResult> asyncPutMessage(final MessageExtBrokerInner msg)
  ```

  * `msg.setStoreTimestamp(System.currentTimeMillis())`：设置存储时间，后面获取到写锁后这个事件会重写
  * `msg.setBodyCRC(UtilAll.crc32(msg.getBody()))`：获取消息的 CRC 值
  * `topic、queueId`：获取主题和队列 ID
  * `if (msg.getDelayTimeLevel() > 0) `：**获取消息的延迟级别，这里是延迟消息实现的关键**
  * `topic = TopicValidator.RMQ_SYS_SCHEDULE_TOPIC`：**修改消息的主题为 `SCHEDULE_TOPIC_XXXX`**
  * `queueId = ScheduleMessageService.delayLevel2QueueId()`：**队列 ID 为延迟级别 -1**
  * `MessageAccessor.putProperty`：**将原来的消息主题和 ID 存入消息的属性 `REAL_TOPIC` 中**
  * `mappedFile = this.mappedFileQueue.getLastMappedFile()`：获取当前顺序写的 MappedFile 对象
  * `putMessageLock.lock()`：**获取写锁**
  * `msg.setStoreTimestamp(beginLockTimestamp)`：设置消息的存储时间为获取锁的时间
  * `if (null == mappedFile || mappedFile.isFull())`：文件写满了创建新的 MF 对象
  * `result = mappedFile.appendMessage(msg, this.appendMessageCallback)`：**消息追加**，核心逻辑在回调器类
  * `putMessageLock.unlock()`：释放写锁
  * `this.defaultMessageStore.unlockMappedFile(..)`：将 MappedByteBuffer 从 lock 切换为 unlock 状态
  * `putMessageResult = new PutMessageResult(PutMessageStatus.PUT_OK, result)`：结果封装
  * `flushResultFuture = submitFlushRequest(result, msg)`：**唤醒刷盘线程**
  * `replicaResultFuture = submitReplicaRequest(result, msg)`：HA 消息同步

* recoverNormally()：正常关机时的恢复方法，存储模块启动时**先恢复所有的 ConsumeQueue 数据，再恢复 CommitLog 数据**

  ```java
  // 参数表示恢复阶段 ConsumeQueue 中已知的最大的消息 offset
  public void recoverNormally(long maxPhyOffsetOfConsumeQueue)
  ```

  * `int index = mappedFiles.size() - 3`：从倒数第三个 file 开始向后恢复

  * `dispatchRequest = this.checkMessageAndReturnSize()`：每次从切片内解析出一条 msg 封装成 DispatchRequest 对象

  * `size = dispatchRequest.getMsgSize()`：获取消息的大小，检查 DispatchRequest 对象的状态

    情况 1：正常数据，则 `mappedFileOffset += size`

    情况 2：文件尾数据，处理下一个文件，mappedFileOffset 置为 0，magic_code 表示文件尾

  * `processOffset += mappedFileOffset`：计算出正确的数据存储位点，并设置 MappedFileQueue 的目录刷盘位点

  * `this.mappedFileQueue.truncateDirtyFiles(processOffset)`：调整 MFQ 中文件的刷盘位点

  * `if (maxPhyOffsetOfConsumeQueue >= processOffset)`：删除冗余数据，将超过全局位点的 CQ 下的文件删除，将包含全局位点的 CQ 下的文件重新定位

* recoverAbnormally()：异常关机时的恢复方法

  ```java
  public void recoverAbnormally(long maxPhyOffsetOfConsumeQueue)
  ```

  * `int index = mappedFiles.size() - 1`：从尾部开始遍历 MFQ，验证 MF 的第一条消息，找到第一个验证通过的文件对象
  * `dispatchRequest = this.checkMessageAndReturnSize()`：每次解析出一条 msg 封装成 DispatchRequest 对象
  * `this.defaultMessageStore.doDispatch(dispatchRequest)`：**重建 ConsumerQueue 和 Index，避免上次异常停机导致 CQ 和 Index 与 CommitLog 不对齐**
  * 剩余逻辑与正常关机的恢复方法相似



***



##### 服务线程

AppendMessageCallback 消息追加服务实现类为 DefaultAppendMessageCallback

* doAppend()：
  
  ```java
  public AppendMessageResult doAppend()
  ```
  
  * `long wroteOffset = fileFromOffset + byteBuffer.position()`：消息写入的位置，物理偏移量 phyOffset
  * `String msgId`：**消息 ID，规则是客户端 IP + 消息偏移量 phyOffset**
  * `byte[] topicData`：序列化消息，将消息的字段压入到  msgStoreItemMemory 这个 Buffer 中
  * `byteBuffer.put(this.msgStoreItemMemory.array(), 0, msgLen)`：将 msgStoreItemMemory 中的数据写入 MF 对象的内存映射的 Buffer 中，数据还没落盘
  * `AppendMessageResult result`：构造结果对象，包括存储位点、是否成功、队列偏移量等信息
  * `CommitLog.this.topicQueueTable.put(key, ++queueOffset)`：更新队列偏移量

FlushRealTimeService 刷盘 CL 数据，默认是异步刷盘类 FlushRealTimeService

* run()：运行方法

  ```java
  public void run()
  ```

  * `while (!this.isStopped())`：stopped为 true 才跳出循环

  * `boolean flushCommitLogTimed`：控制线程的休眠方式，默认是 false，使用 `CountDownLatch.await()` 休眠，设置为 true 时使用 `Thread.sleep()` 休眠

  * `int interval`：获取配置中的刷盘时间间隔

  * `int flushPhysicQueueLeastPages`：**获取最小刷盘页数，默认是 4 页**，脏页达到指定页数才刷盘

  * `int flushPhysicQueueThoroughInterval`：获取强制刷盘周期，默认是 10 秒，达到周期后强制刷盘，不考虑脏页

  * `if (flushCommitLogTimed)`：**休眠逻辑**，避免 CPU 占用太长时间，导致无法执行其他更紧急的任务

  * `CommitLog.this.mappedFileQueue.flush(flushPhysicQueueLeastPages)`：**刷盘**

  * `for (int i = 0; i < RETRY_TIMES_OVER && !result; i++)`：stopped 停止标记为 true 时，需要确保所有的数据都已经刷盘，所以此处尝试 10 次强制刷盘，

    `result = CommitLog.this.mappedFileQueue.flush(0)`：**强制刷盘**

同步刷盘类 GroupCommitService

* run()：运行方法

  ```java
  public void run()
  ```

  * `while (!this.isStopped())`：stopped为 true 才跳出循环

    `this.waitForRunning(10)`：线程休眠 10 毫秒，最后调用 `onWaitEnd()` 进行**请求的交换** `swapRequests()`

    `this.doCommit()`：做提交逻辑

    * `if (!this.requestsRead.isEmpty()) `：读请求集合不为空

      `for (GroupCommitRequest req : this.requestsRead)`：遍历所有的读请求，请求中的属性：

      * `private final long nextOffset`：本条消息存储之后，下一条消息开始的 offset
      * `private CompletableFuture<PutMessageStatus> flushOKFuture`：Future 对象

      `boolean flushOK = ...`：当前请求关注的数据是否全部落盘，**落盘成功唤醒消费者线程**

      `for (int i = 0; i < 2 && !flushOK; i++)`：尝试进行两次强制刷盘，保证刷盘成功

      `CommitLog.this.mappedFileQueue.flush(0)`：强制刷盘

      `req.wakeupCustomer(flushOK ? ...)`：设置 Future 结果，在 Future 阻塞的线程在这里会被唤醒

      `this.requestsRead.clear()`：清理 reqeustsRead 列表，方便交换时成为 requestsWrite 使用

    * `else`：读请求集合为空

      `CommitLog.this.mappedFileQueue.flush(0)`：强制刷盘

  * `this.swapRequests()`：交换读写请求

  * `this.doCommit()`：交换后做一次提交



****



#### ConsQueue

##### 成员属性

ConsumerQueue 是消息消费队列，存储消息在 CommitLog 的索引，便于快速定位消息

成员变量：

* 数据单元：ConsumerQueueData 数据单元的固定大小是 20 字节，默认申请 20 字节的缓冲区

  ```java
  public static final int CQ_STORE_UNIT_SIZE = 20;
  ```

* 文件管理：

  ```java
  private final MappedFileQueue mappedFileQueue;	// 文件管理器，管理 CQ 目录下的文件
  private final String storePath;					// 目录，比如../store/consumequeue/xxx_topic/0
  private final int mappedFileSize;				// 每一个 CQ 存储文件大小，默认 20 * 30w = 600w byte
  ```

* 存储主模块：上层的对象

  ```java
  private final DefaultMessageStore defaultMessageStore;
  ```

* 消息属性：

  ```java
  private final String topic;					// CQ 主题
  private final int queueId;					// CQ 队列，每一个队列都有一个 ConsumeQueue 对象进行管理
  private final ByteBuffer byteBufferIndex;	// 临时缓冲区，插新的 CQData 时使用
  private long maxPhysicOffset = -1;			// 当前ConsumeQueue内存储的最大消息物理偏移量
  private volatile long minLogicOffset = 0;	// 当前ConsumeQueue内存储的最小消息物理偏移量
  ```

构造方法：

* 有参构造：

  ```java
  public ConsumeQueue() {
      // 申请了一个 20 字节大小的 临时缓冲区
      this.byteBufferIndex = ByteBuffer.allocate(CQ_STORE_UNIT_SIZE);
  }
  ```

  

***



##### 成员方法

ConsumeQueue 启动阶段方法：

* load()：第一步，加载 storePath 目录下的文件，初始化 MappedFileQueue
* recover()：第二步，恢复 ConsumeQueue 数据
  * 从倒数第三个 MF 文件开始向后遍历，依次读取 MF 中 20 个字节的 CQData 数据，检查 offset 和 size 是否是有效数据
  * 找到无效的 CQData 的位点，该位点就是 CQ 的刷盘点和数据顺序写入点
  * 删除无效的 MF 文件，调整当前顺序写的 MF 文件的数据位点

其他方法：

* truncateDirtyLogicFiles()：CommitLog 恢复阶段调用，将 ConsumeQueue 有效数据文件与 CommitLog 对齐，将超出部分的数据文删除掉，并调整当前文件的数据位点。Broker 启动阶段先恢复 CQ 的数据，再恢复 CL 数据，但是**数据要以 CL 为基准**

  ```java
  // 参数是最大消息物理偏移量
  public void truncateDirtyLogicFiles(long phyOffet)
  ```

* flush()：刷盘，调用 MFQ 的刷盘方法

  ```java
  public boolean flush(final int flushLeastPages)
  ```

* deleteExpiredFile()：删除过期文件，将小于 offset 的所有 MF 文件删除，offset 是 CommitLog 目录下最小的物理偏移量，小于该值的 CL 文件已经没有了，所以 CQ 也没有存在的必要

  ```java
  public int deleteExpiredFile(long offset)
  ```

* putMessagePositionInfoWrapper()：**向 CQ 中追加 CQData 数据**，由存储主模块 DefaultMessageStore 内部的异步线程调用，负责构建 ConsumeQueue 文件和 Index 文件的，该线程会持续关注 CommitLog 文件，当 CommitLog 文件内有新数据写入，就读出来封装成 DispatchRequest 对象，转发给 ConsumeQueue 或者 IndexService

  ```java
  public void putMessagePositionInfoWrapper(DispatchRequest request)
  ```

* getIndexBuffer()：转换 startIndex 为 offset，获取包含该 offset 的 MappedFile 文件，读取 `[offset%maxSize, mfPos]` 范围的数据，包装成结果对象返回

  ```java
   public SelectMappedBufferResult getIndexBuffer(final long startIndex)
  ```



****



#### IndexFile

##### 成员属性

IndexFile 类成员属性

* 哈希：

  ```java
  private static int hashSlotSize = 4;	// 每个 hash 桶的大小是 4 字节，【用来存放索引的编号】
  private final int hashSlotNum;			// hash 桶的个数，默认 500 万
  ```

* 索引：

  ```java
  private static int indexSize = 20;		// 每个 index 条目的大小是 20 字节
  private static int invalidIndex = 0;	// 无效索引编号：0 特殊值
  private final int indexNum;				// 默认值：2000w
  private final IndexHeader indexHeader;	// 索引头
  ```

* 映射：

  ```java
  private final MappedFile mappedFile;			// 【索引文件使用的 MF 文件】
  private final FileChannel fileChannel;			// 文件通道
  private final MappedByteBuffer mappedByteBuffer;// 从 MF 中获取的内存映射缓冲区
  ```

构造方法：

* 有参构造

  ```java
  // endPhyOffset 上个索引文件 最后一条消息的 物理偏移量
  // endTimestamp 上个索引文件 最后一条消息的 存储时间
  public IndexFile(final String fileName, final int hashSlotNum, final int indexNum,
                   final long endPhyOffset, final long endTimestamp) throws IOException {
      // 文件大小 40 + 500w * 4 + 2000w * 20
      int fileTotalSize =
          IndexHeader.INDEX_HEADER_SIZE + (hashSlotNum * hashSlotSize) + (indexNum * indexSize);
      // 创建 mf 对象，会在disk上创建文件
      this.mappedFile = new MappedFile(fileName, fileTotalSize);
      // 创建 索引头对象，传递 索引文件mf 的切片数据
      this.indexHeader = new IndexHeader(byteBuffer);
  	//...
  }
  ```



****



##### 成员方法

IndexFile 类方法

* load()：加载 IndexHeader

  ```java
  public void load()
  ```

* flush()：MappedByteBuffer 内的数据强制落盘

  ```java
  public void flush()
  ```

* isWriteFull()：检查当前的 IndexFile 已写索引数是否 >= indexNum，达到该值则当前 IndexFile 不能继续追加 IndexData 了

  ```java
  public boolean isWriteFull()
  ```

* destroy()：删除文件时使用的方法

  ```java
  public boolean destroy(final long intervalForcibly)
  ```

* putKey()：添加索引数据，解决哈希冲突使用**头插法**

  ```java
  // 参数一：消息的 key，uniq_key 或者 keys="aaa bbb ccc" 会分别为 aaa bbb ccc 创建索引
  // 参数二：消息的物理偏移量；  参数三：消息存储时间
  public boolean putKey(final String key, final long phyOffset, final long storeTimestamp)
  ```

  * `int slotPos = keyHash % this.hashSlotNum`：对 key 计算哈希后，取模得到对应的哈希槽 slot 下标，然后计算出哈希槽的存储位置 absSlotPos
  * `int slotValue = this.mappedByteBuffer.getInt(absSlotPos)`：获取槽中的值，如果是无效值说明没有哈希冲突
  * `timeDiff = timeDiff / 1000`：计算当前 msg 存储时间减去索引文件内第一条消息存储时间的差值，转化为秒进行存储
  * `int absIndexPos`：计算当前索引数据存储的位置，开始填充索引数据到对应的位置
  * `this.mappedByteBuffer.putInt(absIndexPos + 4 + 8 + 4, slotValue)`：**hash 桶的原值，头插法**
  * `this.mappedByteBuffer.putInt(absSlotPos, this.indexHeader...)`：在 slot 放入当前索引的索引编号
  * `if (this.indexHeader.getIndexCount() <= 1)`：索引文件插入的第一条数据，需要设置起始偏移量和存储时间
  * `if (invalidIndex == slotValue)`：没有哈希冲突，说明占用了一个新的 hash slot
  * `this.indexHeader`：设置索引头的相关属性

* selectPhyOffset()：从索引文件查询消息的物理偏移量

  ```java
  // 参数一：查询结果全部放到该list内； 参数二：查询key； 参数三：结果最大数限制； 参数四五：时间范围
  public void selectPhyOffset(final List<Long> phyOffsets, final String key, final int maxNum,final long begin, final long end, boolean lock)
  ```

  * `if (this.mappedFile.hold())`： MF 的引用记数 +1，查询期间 MF 资源**不能被释放**
  * `int slotValue = this.mappedByteBuffer.getInt(absSlotPos)`：获取槽中的值，可能是无效值或者索引编号，如果是无效值说明查询未命中
  * `int absIndexPos`：计算出索引编号对应索引数据的开始位点
  * `this.mappedByteBuffer`：读取索引数据
  * `long timeRead = this.indexHeader.getBeginTimestamp() + timeDiff`：计算出准确的存储时间
  * `boolean timeMatched = (timeRead >= begin) && (timeRead <= end)`：时间范围的匹配
  * `phyOffsets.add(phyOffsetRead)`：将命中的消息索引的消息偏移量加入到 list 集合中
  * `nextIndexToRead = prevIndexRead`：遍历前驱节点



****



#### IndexServ

##### 成员属性

IndexService 类用来管理 IndexFile 文件

成员变量：

* 存储主模块：

  ```java
  private final DefaultMessageStore defaultMessageStore;
  ```

* 索引文件存储目录：`../store/index`

  ```java
  private final String storePath;
  ```

* 索引对象集合：目录下的每个文件都有一个 IndexFile 对象

  ```java
  private final ArrayList<IndexFile> indexFileList = new ArrayList<IndexFile>();
  ```

* 索引文件：

  ```java
  private final int hashSlotNum;		// 每个索引文件包含的 哈希桶数量 ：500w
  private final int indexNum;			// 每个索引文件包含的 索引条目数量 ：2000w
  ```



***



##### 成员方法

* load()：加载 storePath 目录下的文件，为每个文件创建一个 IndexFile 实例对象，并加载 IndexHeader 信息

  ```java
  public boolean load(final boolean lastExitOK)
  ```

* deleteExpiredFile()：删除过期索引文件

  ```java
  // 参数 offset 表示 CommitLog 内最早的消息的 phyOffset
  public void deleteExpiredFile(long offset)
  ```

  * `this.readWriteLock.readLock().lock()`：加锁判断
  * `long endPhyOffset = this.indexFileList.get(0).getEndPhyOffset()`：获取目录中第一个文件的结束偏移量
  * `if (endPhyOffset < offset)`：索引目录内存在过期的索引文件，并且当前的 IndexFile 都是过期的数据
  * `for (int i = 0; i < (files.length - 1); i++)`：遍历文件列表，删除过期的文件

* buildIndex()：存储主模块 DefaultMessageStore 内部的异步线程调用，构建 Index 数据

  ```java
  public void buildIndex(DispatchRequest req)
  ```

  * `indexFile = retryGetAndCreateIndexFile()`：获取或者创建顺序写的索引文件对象

  * `buildKey(topic, req.getUniqKey())`：**构建索引 key，`topic + # + uniqKey`**

  * `indexFile = putKey()`：插入索引文件

  * `if (keys != null && keys.length() > 0)`：消息存在自定义索引 keys

    `for (int i = 0; i < keyset.length; i++)`：遍历每个索引，为每个 key 调用一次 putKey

* getAndCreateLastIndexFile()：获取当前顺序写的 IndexFile，没有就创建

  ```java
  public IndexFile getAndCreateLastIndexFile()
  ```



***



#### HAService

##### HAService

###### Service

HAService 类成员变量：

* 主节点属性：

  ```java
  // master 节点当前有多少个 slave 节点与其进行数据同步
  private final AtomicInteger connectionCount = new AtomicInteger(0);
  // master 节点会给每个发起连接的 slave 节点的通道创建一个 HAConnection，【控制 master 端向 slave 端传输数据】
  private final List<HAConnection> connectionList = new LinkedList<>();
  // master 向 slave 节点推送的最大的 offset，表示数据同步的进度
  private final AtomicLong push2SlaveMaxOffset = new AtomicLong(0)
  ```

* 内部类属性：

  ```java
  // 封装了绑定服务器指定端口，监听 slave 的连接的逻辑，没有使用 Netty，使用了原生态的 NIO 去做
  private final AcceptSocketService acceptSocketService;
  // 控制生产者线程阻塞等待的逻辑
  private final GroupTransferService groupTransferService;
  // slave 节点的客户端对象，【slave 端才会正常运行该实例】
  private final HAClient haClient;
  ```

* 线程通信对象：

  ```java
  private final WaitNotifyObject waitNotifyObject = new WaitNotifyObject()
  ```

成员方法：

* start()：启动高可用服务

  ```java
  public void  start() throws Exception {
      // 监听从节点
      this.acceptSocketService.beginAccept();
      // 启动监听服务
      this.acceptSocketService.start();
      // 启动转移服务
      this.groupTransferService.start();
      // 启动从节点客户端实例
      this.haClient.start();
  }
  ```



****



###### Accept

AcceptSocketService 类用于**监听从节点的连接**，创建 HAConnection 连接对象

成员变量：

* 端口信息：Master 绑定监听的端口信息

  ```java
  private final SocketAddress socketAddressListen;
  ```

* 服务端通道：

  ```java
  private ServerSocketChannel serverSocketChannel;
  ```

* 多路复用器：

  ```java
  private Selector selector;
  ```

成员方法：

* beginAccept()：开始监听连接，**NIO** 标准模板

  ```java
  public void beginAccept()
  ```

* run()：服务启动

  ```java
  public void run()
  ```

  * `this.selector.select(1000)`：多路复用器阻塞获取就绪的通道，最多等待 1 秒钟
  * `Set<SelectionKey> selected = this.selector.selectedKeys()`：获取选择器中所有注册的通道中已经就绪好的事件
  * `for (SelectionKey k : selected)`：遍历所有就绪的事件
  * `if ((k.readyOps() & SelectionKey.OP_ACCEPT) != 0)`：说明 `OP_ACCEPT` 事件就绪
  * `SocketChannel sc = ((ServerSocketChannel) k.channel()).accept()`：**获取到客户端连接的通道**
  * `HAConnection conn = new HAConnection(HAService.this, sc)`：**为每个连接 master 服务器的 slave 创建连接对象**
  * `conn.start()`：**启动 HAConnection 对象**，内部启动两个服务为读数据服务、写数据服务
  * `HAService.this.addConnection(conn)`：加入到 HAConnection 集合内



****



###### Group

GroupTransferService 用来控制数据同步

成员方法：

* doWaitTransfer()：等待主从数据同步

  ```java
  private void doWaitTransfer()
  ```

  * `if (!this.requestsRead.isEmpty())`：读请求不为空
  * `boolean transferOK = HAService.this.push2SlaveMaxOffset... >= req.getNextOffset()`：**主从同步是否完成**
  * `req.wakeupCustomer(transferOK ? ...)`：唤醒消费者
  * `this.requestsRead.clear()`：清空读请求
  
* swapRequests()：交换读写请求

  ```java
  private void swapRequests()
  ```

  



****



##### HAClient

###### 成员属性

HAClient 是 slave 端运行的代码，用于**和 master 服务器建立长连接**，上报本地同步进度，消费服务器发来的 msg 数据

成员变量：

* 缓冲区：

  ```java
  private static final int READ_MAX_BUFFER_SIZE = 1024 * 1024 * 4;	// 默认大小：4 MB
  private ByteBuffer byteBufferRead = ByteBuffer.allocate(READ_MAX_BUFFER_SIZE);
  private ByteBuffer byteBufferBackup = ByteBuffer.allocate(READ_MAX_BUFFER_SIZE);
  ```

* 主节点地址：格式为 `ip:port`

  ```java
  private final AtomicReference<String> masterAddress = new AtomicReference<>()
  ```

* NIO 属性：

  ```java
  private final ByteBuffer reportOffset;	// 通信使用NIO，所以消息使用块传输，上报 slave offset 使用
  private SocketChannel socketChannel;	// 客户端与 master 的会话通道				
  private Selector selector;				// 多路复用器
  ```

* 通信时间：上次会话通信时间，用于控制 socketChannel 是否关闭的

  ````java
  private long lastWriteTimestamp = System.currentTimeMillis();
  ````

* 进度信息：

  ```java
  private long currentReportedOffset = 0;	// slave 当前的进度信息
  private int dispatchPosition = 0;		// 控制 byteBufferRead position 指针
  ```



***



###### 成员方法

* run()：启动方法

  ```java
  public void run()
  ```

  * `if (this.connectMaster())`：连接主节点，连接失败会休眠 5 秒

    * `String addr = this.masterAddress.get()`：获取 master 暴露的 HA 地址端口信息
    * `this.socketChannel = RemotingUtil.connect(socketAddress)`：建立连接
    * `this.socketChannel.register(this.selector, SelectionKey.OP_READ)`：注册到多路复用器，**关注读事件**
    * `this.currentReportedOffset`： 初始化上报进度字段为 slave 的 maxPhyOffset

  * `if (this.isTimeToReportOffset())`：slave 每 5 秒会上报一次 slave 端的同步进度信息给 master

    `boolean result = this.reportSlaveMaxOffset()`：**上报同步信息**，上报失败关闭连接

  * `this.selector.select(1000)`：多路复用器阻塞获取就绪的通道，最多等待 1 秒钟，**获取到就绪事件或者超时后结束**

  * `boolean ok = this.processReadEvent()`：处理读事件

  * `if (!reportSlaveMaxOffsetPlus())`：检查是否重新上报同步进度

* reportSlaveMaxOffset()：上报 slave 同步进度

  ```java
  private boolean reportSlaveMaxOffset(final long maxOffset)
  ```

  * 首先向缓冲区写入 slave 端最大偏移量，写完以后切换为指定置为初始状态

  * `for (int i = 0; i < 3 && this.reportOffset.hasRemaining(); i++)`：尝试三次写数据

    `this.socketChannel.write(this.reportOffset)`：**写数据**

  * `return !this.reportOffset.hasRemaining()`：写成功之后 pos = limit

* processReadEvent()：处理 master 发送给 slave 数据，返回 true 表示处理成功   false 表示 Socket 处于半关闭状态，需要上层重建 haClient

  ```java
  private boolean processReadEvent()
  ```

  * `int readSizeZeroTimes = 0`：控制 while 循环的一个条件变量，当值为 3 时跳出循环

  * `while (this.byteBufferRead.hasRemaining())`：byteBufferRead 有空间可以去 Socket 读缓冲区加载数据

  * `int readSize = this.socketChannel.read(this.byteBufferRead)`：**从通道读数据**

  * `if (readSize > 0)`：加载成功，有新数据

    `readSizeZeroTimes = 0`：置为 0

    `boolean result = this.dispatchReadRequest()`：处理数据的核心逻辑

  * `else if (readSize == 0) `：连续无新数据 3 次，跳出循环

  * `else`：readSize = -1 就表示 Socket 处于半关闭状态，对端已经关闭了

* dispatchReadRequest()：**处理数据的核心逻辑**，master 与 slave 传输的数据格式 `{[phyOffset][size][data...]}`，phyOffset 表示数据区间的开始偏移量，data 代表数据块，最大 32kb，可能包含多条消息的数据

  ```java
  private boolean dispatchReadRequest()
  ```

  * `final int msgHeaderSize = 8 + 4`：协议头大小 12

  * `int readSocketPos = this.byteBufferRead.position()`：记录缓冲区处理数据前的 pos 位点，用于恢复指针

  * `int diff = ...`：当前 byteBufferRead 还剩多少 byte 未处理，每处理一条帧数据都会更新 dispatchPosition

  * `if (diff >= msgHeaderSize)`：缓冲区还有完整的协议头 header 数据

  * `if (diff >= (msgHeaderSize + bodySize))`：说明**缓冲区内是包含当前帧的全部数据的**，开始处理帧数据 

    `HAService...appendToCommitLog(masterPhyOffset, bodyData)`：**存储数据到 CommitLog**，并构建 Index 和 CQ

    `this.byteBufferRead.position(readSocketPos)`：恢复 byteBufferRead 的 pos 指针

    `this.dispatchPosition += msgHeaderSize + bodySize`：加一帧数据长度，处理下一条数据使用

    `if (!reportSlaveMaxOffsetPlus())`：上报 slave 同步信息

  * `if (!this.byteBufferRead.hasRemaining())`：缓冲区写满了，重新分配缓冲区

* reallocateByteBuffer()：重新分配缓冲区

  ```java
  private void reallocateByteBuffer()
  ```

  * `int remain = READ_MAX_BUFFER_SIZE - this.dispatchPosition`：表示缓冲区尚未处理过的字节数量

  * `if (remain > 0)`：条件成立，说明缓冲区**最后一帧数据是半包数据**，但是不能丢失数据

    `this.byteBufferBackup.put(this.byteBufferRead)`：**将半包数据拷贝到 backup 缓冲区**

  * `this.swapByteBuffer()`：交换 backup 成为 read

  * `this.byteBufferRead.position(remain)`：设置 pos 为 remain ，后续加载数据 pos 从remain 开始向后移动

  * `this.dispatchPosition = 0`：当前缓冲区交换之后，相当于是一个全新的 byteBuffer，所以分配指针归零



***



##### HAConn

###### Connection

HAConnection 类成员变量：

* 会话通道：master 和 slave 之间通信的 SocketChannel 

  ```java
  private final SocketChannel socketChannel;
  ```

* 客户端地址：

  ```java
  private final String clientAddr;
  ```

* 服务类：

  ```java
  private WriteSocketService writeSocketService;	// 写数据服务
  private ReadSocketService readSocketService;	// 读数据服务
  ```

* 请求位点：在 slave 上报本地的进度之后被赋值，该值大于 0 后同步逻辑才会运行，master 如果不知道 slave 节点当前消息的存储进度，就无法给 slave 推送数据

  ```java
  private volatile long slaveRequestOffset = -1;
  ```

* 应答位点： 保存最新的 slave 上报的 offset 信息，slaveAckOffset 之前的数据都可以认为 slave 已经同步完成

  ```java
  private volatile long slaveAckOffset = -1;
  ```

核心方法：

* 构造方法：

  ```java
  public HAConnection(final HAService haService, final SocketChannel socketChannel) {
      // 初始化一些东西
      // 设置 socket 读写缓冲区为 64kb 大小
      this.socketChannel.socket().setReceiveBufferSize(1024 * 64);
      this.socketChannel.socket().setSendBufferSize(1024 * 64);
      // 创建读写服务
      this.writeSocketService = new WriteSocketService(this.socketChannel);
      this.readSocketService = new ReadSocketService(this.socketChannel);
      // 自增
      this.haService.getConnectionCount().incrementAndGet();
  }
  ```

* 启动方法：

  ```java
  public void start() {
      this.readSocketService.start();
      this.writeSocketService.start();
  }
  ```



***



###### ReadSocket

ReadSocketService 类是一个任务对象，slave 向 master 传输的帧格式为 `[long][long][long]`，上报的是 slave 本地的同步进度，同步进度是一个 long 值

成员变量：

* 读缓冲：

  ```java
  private static final int READ_MAX_BUFFER_SIZE = 1024 * 1024;	// 默认大小 1MB
  private final ByteBuffer byteBufferRead = ByteBuffer.allocate(READ_MAX_BUFFER_SIZE);
  ```

* NIO 属性：

  ```java
  private final Selector selector;			// 多路复用器
  private final SocketChannel socketChannel;	// master 与 slave 之间的会话 SocketChannel
  ```

* 处理位点：缓冲区处理位点

  ```java
  private int processPosition = 0;
  ```

* 上次读操作的时间：

  ```java
  private volatile long lastReadTimestamp = System.currentTimeMillis();
  ```

核心方法：

* 构造方法：

  ```java
  public ReadSocketService(final SocketChannel socketChannel)
  ```

  * `this.socketChannel.register(this.selector, SelectionKey.OP_READ)`：通道注册到多路复用器，关注读事件
  * `this.setDaemon(true)`：设置为守护线程

* 运行方法：

  ```java
  public void run()
  ```

  * `this.selector.select(1000)`：多路复用器阻塞获取就绪的通道，最多等待 1 秒钟，获取到就绪事件或者超时后结束

  * `boolean ok = this.processReadEvent()`：**读数据的核心方法**，返回 true 表示处理成功   false 表示 Socket 处于半关闭状态，需要上层重建 HAConnection 对象

    * `int readSizeZeroTimes = 0`：控制 while 循环，当连续从 Socket 读取失败 3 次（未加载到数据）跳出循环

    * `if (!this.byteBufferRead.hasRemaining())`：byteBufferRead 已经全部使用完，需要清理数据并更新位点

    * `while (this.byteBufferRead.hasRemaining())`：byteBufferRead 有空间可以去 Socket 读缓冲区加载数据

    * `int readSize = this.socketChannel.read(this.byteBufferRead)`：**从通道读数据**

    * `if (readSize > 0)`：加载成功，有新数据

      `if ((byteBufferRead.position() - processPosition) >= 8)`：缓冲区的可读数据最少包含一个数据帧

      * `int pos = ...`：**获取可读帧数据中最后一个完整的帧数据的位点，后面的数据丢弃**
    * `long readOffset = ...byteBufferRead.getLong(pos - 8)`：读取最后一帧数据，slave 端当前的同步进度信息
      
      * `this.processPosition = pos`：更新处理位点
      * `HAConnection.this.slaveAckOffset = readOffset`：更新应答位点
      * `if (HAConnection.this.slaveRequestOffset < 0)`：条件成立**给 slaveRequestOffset 赋值**
      * `HAConnection...notifyTransferSome(slaveAckOffset)`：**唤醒阻塞的生产者线程**
      
    * `else if (readSize == 0) `：读取 3 次无新数据跳出循环
  
    * `else`：readSize = -1 就表示 Socket 处于半关闭状态，对端已经关闭了
  
  * `if (interval > 20)`：超过 20 秒未发生通信，直接结束循环



***



###### WriteSocket

WriteSocketService 类是一个任务对象，master 向 slave 传输的数据帧格式为 `{[phyOffset][size][data...]}{[phyOffset][size][data...]}`

* phyOffset：数据区间的开始偏移量，并不表示某一条具体的消息，表示的数据块开始的偏移量位置
* size：同步的数据块的大小
* data：数据块，最大 32kb，可能包含多条消息的数据

成员变量：

* 协议头：

  ```java
  private final int headerSize = 8 + 4;		// 协议头大小：12
  private final ByteBuffer byteBufferHeader;	// 帧头缓冲区
  ```

* NIO 属性：

  ```java
  private final Selector selector;			// 多路复用器
  private final SocketChannel socketChannel;	// master 与 slave 之间的会话 SocketChannel
  ```

* 处理位点：下一次传输同步数据的位置信息，master 给当前 slave 同步的位点

  ```java
  private long nextTransferFromWhere = -1;
  ```

* 上次写操作：

  ```java
  private boolean lastWriteOver = true;							// 上一轮数据是否传输完毕
  private long lastWriteTimestamp = System.currentTimeMillis();	// 上次写操作的时间
  ```

核心方法：

* 构造方法：

  ```java
  public WriteSocketService(final SocketChannel socketChannel)
  ```

  * `this.socketChannel.register(this.selector, SelectionKey.OP_WRITE)`：通道注册到多路复用器，关注写事件
  * `this.setDaemon(true)`：设置为守护线程

* 运行方法：

  ```java
  public void run()
  ```

  * `this.selector.select(1000)`：多路复用器阻塞获取就绪的通道，最多等待 1 秒钟，获取到就绪事件或者超时后结束

  * `if (-1 == HAConnection.this.slaveRequestOffset)`：**等待 slave 同步完数据**

  * `if (-1 == this.nextTransferFromWhere)`：条件成立，需要初始化该变量
  
    `if (0 == HAConnection.this.slaveRequestOffset)`：slave 是一个全新节点，从正在顺序写的 MF 开始同步数据
  
    `long masterOffset = ...`：获取 master 最大的 offset，并计算归属的 mappedFile 文件的开始 offset
  
    `this.nextTransferFromWhere = masterOffset`：**赋值给下一次传输同步数据的位置信息**
  
    `this.nextTransferFromWhere = HAConnection.this.slaveRequestOffset`：大部分情况走这个赋值逻辑
  
  * `if (this.lastWriteOver)`：上一次待发送数据全部发送完成
  
    `if (interval > 5)`：**超过 5 秒未同步数据，发送一个 header 心跳数据包，维持长连接**
  
  * `else`：上一轮的待发送数据未全部发送，需要同步数据到 slave 节点
  
  * `SelectMappedBufferResult selectResult`：**到 CommitLog 中查询 nextTransferFromWhere 开始位置的数据**
  
  * `if (size > 32k)`：一次最多同步 32k 数据
  
  * `this.nextTransferFromWhere += size`：增加 size，下一轮传输跳过本帧数据
  
  * `selectResult.getByteBuffer().limit(size)`：设置 byteBuffer 可访问数据区间为 [pos, size]
  
  * `this.selectMappedBufferResult = selectResult`：**待发送的数据**
  
  * `this.byteBufferHeader.put`：**构建帧头数据**
  
  * `this.lastWriteOver = this.transferData()`：处理数据，返回是否处理完成

* 同步方法：**同步数据到 slave 节点**，返回 true 表示本轮数据全部同步完成，false 表示本轮同步未完成（Header 和 Body 其中一个未同步完成都会返回 false）

  ```java
  private boolean transferData()
  ```

  * `int writeSizeZeroTimes= 0`：控制 while 循环，当写失败连续 3 次时，跳出循环）跳出循环

  * `while (this.byteBufferHeader.hasRemaining())`：**帧头数据缓冲区有待发送的数据**

  * `int writeSize = this.socketChannel.write(this.byteBufferHeader)`：向通道写帧头数据

  * `if (null == this.selectMappedBufferResult)`：说明是心跳数据，返回心跳数据是否发送完成

  * `if (!this.byteBufferHeader.hasRemaining())`：**Header写成功之后，才进行写 Body**

  * `while (this.selectMappedBufferResult.getByteBuffer().hasRemaining())`：**数据缓冲区有待发送的数据**

  * `int writeSize = this.socketChannel.write(this.selectMappedBufferResult...)`：向通道写帧头数据

  * `if (writeSize > 0)`：写数据成功，但是不代表 SMBR 中的数据全部写完成

  * `boolean result`：判断是否发送完成，返回该值





****



#### MesStore

##### 生命周期

DefaultMessageStore 类核心是整个存储服务的调度类

* 构造方法：

  ```java
  public DefaultMessageStore()
  ```

  * `this.allocateMappedFileService.start()`：启动**创建 MappedFile 文件服务**
  * `this.indexService.start()`：启动索引服务

* load()：先加载 CommitLog，再加载 ConsumeQueue，最后加载 IndexFile，加载完进入恢复阶段，先恢复 CQ，在恢复 CL

  ```java
  public boolean load()
  ```

* start()：核心启动方法

  ```java
  public void start()
  ```

  * `lock = lockFile.getChannel().tryLock(0, 1, false)`：获取文件锁，获取失败说明当前目录已经启动过 Broker

  * `long maxPhysicalPosInLogicQueue = commitLog.getMinOffset()`：遍历全部的 CQ 对象，获取 CQ 中消息的最大偏移量

  * `this.reputMessageService.start()`：设置分发服务的分发位点，启动**分发服务**，构建 ConsumerQueue 和 IndexFile

  * `if (dispatchBehindBytes() <= 0)`：线程等待分发服务将分发数据全部处理完毕

  * `this.recoverTopicQueueTable()`：因为修改了 CQ 数据，所以再次构建队列偏移量字段表

  * `this.haService.start()`：启动 **HA 服务**

  * `this.handleScheduleMessageService()`：启动**消息调度服务**

  * `this.flushConsumeQueueService.start()`：启动 CQ **消费队列刷盘服务**

  * `this.commitLog.start()`：启动 **CL 刷盘服务**

  * `this.storeStatsService.start()`：启动状态存储服务

  * `this.createTempFile()`：创建 AbortFile，正常关机时 JVM HOOK 会删除该文件，**异常宕机时该文件不会删除**，开机数据恢复阶段根据是否存在该文件，执行不同的恢复策略

  * `this.addScheduleTask()`：添加定时任务

    * `DefaultMessageStore.this.cleanFilesPeriodically()`：**定时清理过期文件**，周期是 10 秒

      * `this.cleanCommitLogService.run()`：启动清理过期的 CL 文件服务
      * `this.cleanConsumeQueueService.run()`：启动清理过期的 CQ 文件服务

    * `DefaultMessageStore.this.checkSelf()`：每 10 分种进行健康检查

    * `DefaultMessageStore.this.cleanCommitLogService.isSpaceFull()`：**磁盘预警定时任务**，每 10 秒一次

      * `if (physicRatio > this.diskSpaceWarningLevelRatio)`：检查磁盘是否到达 waring 阈值，默认 90%

        `boolean diskok = ...runningFlags.getAndMakeDiskFull()`：设置磁盘写满标记

      * `boolean diskok = ...this.runningFlags.getAndMakeDiskOK()`：设置磁盘可写标记

  * `this.shutdown = false`：刚启动，设置为 false

* shutdown()：关闭各种服务和线程资源，设置存储模块状态为关闭状态

  ```java
  public void shutdown()
  ```

* destroy()：销毁 Broker 的工作目录

  ```java
  public void destroy()
  ```





***



##### 服务线程

ServiceThread 类被很多服务继承，本身是一个 Runnable 任务对象，继承者通过重写 run 方法来实现服务的逻辑

* run()：一般实现方式

  ```java
  public void run() {
      while (!this.isStopped()) {
          // 业务逻辑
      }
  }
  ```

  通过参数 stopped 控制服务的停止，使用 volatile 修饰保证可见性

  ```java
  protected volatile boolean stopped = false
  ```

* shutdown()：停止线程，首先设置 stopped 为 true，然后进行唤醒，默认不直接打断线程

  ```java
  public void shutdown()
  ```

* waitForRunning()：挂起线程，设置唤醒标记 hasNotified 为 false

  ```java
  protected void waitForRunning(long interval)
  ```

* wakeup()：唤醒线程，设置 hasNotified 为 true

  ```java
  public void wakeup()
  ```



***



##### 构建服务

AllocateMappedFileService **创建 MappedFile 服务**

* mmapOperation()：核心服务

  ```java
  private boolean mmapOperation()
  ```

  * `req = this.requestQueue.take()`： **从 requestQueue 阻塞队列（优先级）中获取 AllocateRequest 任务**
  * `if (...isTransientStorePoolEnable())`：条件成立使用直接内存写入数据， 从直接内存中 commit 到 FileChannel 中
  * `mappedFile = new MappedFile(req.getFilePath(), req.getFileSize())`：根据请求的路径和大小创建对象
  * `mappedFile.warmMappedFile()`：判断 mappedFile 大小，只有 CommitLog 才进行文件预热
  * `req.setMappedFile(mappedFile)`：将创建好的 MF 对象的赋值给请求对象的成员属性
  * `req.getCountDownLatch().countDown()`：**唤醒请求的阻塞线程**

* putRequestAndReturnMappedFile()：MappedFileQueue 中用来创建 MF 对象的方法

  ```java
  public MappedFile putRequestAndReturnMappedFile(String nextFilePath, String nextNextFilePath, int fileSize)
  ```

  * `AllocateRequest nextReq = new AllocateRequest(...)`：创建 nextFilePath 的 AllocateRequest 对象，放入请求列表和阻塞队列，然后创建 nextNextFilePath 的 AllocateRequest 对象，放入请求列表和阻塞队列
  * `AllocateRequest result = this.requestTable.get(nextFilePath)`：从请求列表获取 nextFilePath 的请求对象
  * `result.getCountDownLatch().await(...)`：**线程挂起**，直到超时或者 nextFilePath 对应的 MF 文件创建完成
  * `return result.getMappedFile()`：返回创建好的 MF 文件对象

ReputMessageService 消息分发服务，用于构**建 ConsumerQueue 和 IndexFile 文件**

* run()：**循环执行 doReput 方法**，**所以发送的消息存储进 CL 就可以产生对应的 CQ**，每执行一次线程休眠 1 毫秒

  ```java
  public void run()
  ```

* doReput()：实现分发的核心逻辑

  ```java
  private void doReput()
  ```

  * `for (boolean doNext = true; this.isCommitLogAvailable() && doNext; )`：循环遍历
  * `SelectMappedBufferResult result`： 从 CommitLog 拉取数据，数据范围 `[reputFromOffset, 包含该偏移量的 MF 的最大 Pos]`，封装成结果对象
  * `DispatchRequest dispatchRequest`：从结果对象读取出一条 DispatchRequest 数据
  * `DefaultMessageStore.this.doDispatch(dispatchRequest)`：将数据交给分发器进行分发，用于**构建 CQ 和索引文件**
  * `this.reputFromOffset += size`：更新数据范围



***



##### 刷盘服务

FlushConsumeQueueService 刷盘 CQ 数据

* run()：每隔 1 秒执行一次刷盘服务，跳出循环后还会执行一次强制刷盘

  ```java
  public void run()
  ```

* doFlush()：刷盘

  ```java
  private void doFlush(int retryTimes)
  ```

  * `int flushConsumeQueueLeastPages`：脏页阈值，默认是 2

  * `if (retryTimes == RETRY_TIMES_OVER)`：**重试次数是 3** 时设置强制刷盘，设置脏页阈值为 0
  * `int flushConsumeQueueThoroughInterval`：两次刷新的**时间间隔超过 60 秒**会强制刷盘
  * `for (ConsumeQueue cq : maps.values())`：遍历所有的 CQ，进行刷盘
  * `DefaultMessageStore.this.getStoreCheckpoint().flush()`：强制刷盘时将 StoreCheckpoint 瞬时数据刷盘

FlushCommitLogService 刷盘 CL 数据，默认是异步刷盘

* run()：运行方法

  ```java
  public void run()
  ```

  * `while (!this.isStopped())`：stopped为 true 才跳出循环
  
  * `boolean flushCommitLogTimed`：控制线程的休眠方式，默认是 false，使用 `CountDownLatch.await()` 休眠，设置为 true 时使用 `Thread.sleep()` 休眠
  
  * `int interval`：获取配置中的刷盘时间间隔
  
  * `int flushPhysicQueueLeastPages`：获取最小刷盘页数，默认是 4 页，脏页达到指定页数才刷盘
  
  * `int flushPhysicQueueThoroughInterval`：获取强制刷盘周期，默认是 10 秒，达到周期后强制刷盘，不考虑脏页
  
  * `if (flushCommitLogTimed)`：休眠逻辑，避免 CPU 占用太长时间，导致无法执行其他更紧急的任务
  
  * `CommitLog.this.mappedFileQueue.flush(flushPhysicQueueLeastPages)`：**刷盘**
  
  * `for (int i = 0; i < RETRY_TIMES_OVER && !result; i++)`：stopped 停止标记为 true 时，需要确保所有的数据都已经刷盘，所以此处尝试 10 次强制刷盘，
  
    `result = CommitLog.this.mappedFileQueue.flush(0)`：**强制刷盘**



***



##### 清理服务

CleanCommitLogService 清理过期的 CL 数据，定时任务 10 秒调用一次，**先清理 CL，再清理 CQ**，因为 CQ 依赖于 CL 的数据

* run()：运行方法

  ```java
  public void run()
  ```

* deleteExpiredFiles()：删除过期 CL 文件

  ```java
  private void deleteExpiredFiles()
  ```

  * `long fileReservedTime`：默认 72，代表文件的保留时间
  * `boolean timeup = this.isTimeToDelete()`：当前时间是否是凌晨 4 点
  * `boolean spacefull = this.isSpaceToDelete()`：CL 或者 CQ 的目录磁盘使用率达到阈值标准 85%
  * `boolean manualDelete = this.manualDeleteFileSeveralTimes > 0`：手动删除文件
  * `fileReservedTime *= 60 * 60 * 1000`：默认保留 72 小时
  * `deleteCount = DefaultMessageStore.this.commitLog.deleteExpiredFile()`：**调用 MFQ 对象的删除方法**

CleanConsumeQueueService 清理过期的 CQ 数据

* run()：运行方法

  ```java
  public void run()
  ```

* deleteExpiredFiles()：删除过期 CQ 文件

  ```java
  private void deleteExpiredFiles()
  ```

  * `int deleteLogicsFilesInterval`：清理 CQ 的时间间隔，默认 100 毫秒
  * `long minOffset = DefaultMessageStore.this.commitLog.getMinOffset()`：获取 CL 文件中最小的物理偏移量
  * `if (minOffset > this.lastPhysicalMinOffset)`：CL 最小的偏移量大于 CQ 最小的，说明有过期数据
  * `this.lastPhysicalMinOffset = minOffset`：更新 CQ 的最小偏移量
  * `for (ConsumeQueue logic : maps.values())`：遍历所有的 CQ 文件
  * `logic.deleteExpiredFile(minOffset)`：**调用 MFQ 对象的删除方法**
  * `DefaultMessageStore.this.indexService.deleteExpiredFile(minOffset)`：**删除过期的索引文件**



***



##### 获取消息

DefaultMessageStore#getMessage 用于获取消息，在 PullMessageProcessor#processRequest 方法中被调用 （提示：建议学习消费者源码时再阅读）

```java
// offset: 客户端拉消息使用位点；   maxMsgNums: 32；  messageFilter: 一般这里是 tagCode 过滤 
public GetMessageResult getMessage(final String group, final String topic, final int queueId, final long offset, final int maxMsgNums, final MessageFilter messageFilter)
```

* `if (this.shutdown)`：检查运行状态

* `GetMessageResult getResult`：创建查询结果对象

* `final long maxOffsetPy = this.commitLog.getMaxOffset()`：**获取 CommitLog 最大物理偏移量**

* `ConsumeQueue consumeQueue = findConsumeQueue(topic, queueId)`：根据主题和队列 ID 获取 ConsumeQueue对象

* `minOffset, maxOffset`：获取当前 ConsumeQueue 的最小 offset 和 最大 offset，**判断是否满足本次 Pull 的 offset**

  `if (maxOffset == 0)`：说明队列内无数据，设置状态为 NO_MESSAGE_IN_QUEUE，外层进行长轮询

  `else if (offset < minOffset)`：说明 offset 太小了，设置状态为 OFFSET_TOO_SMALL

  `else if (offset == maxOffset)`：消费进度持平，设置状态为 OFFSET_OVERFLOW_ONE，外层进行长轮询

  `else if (offset > maxOffset)`：说明 offset 越界了，设置状态为 OFFSET_OVERFLOW_BADLY

* `SelectMappedBufferResult bufferConsumeQueue`：查询 CQData **获取包含该 offset 的 MappedFile 文件**，如果该文件不是顺序写的文件，就读取 `[offset%maxSize, 文件尾]` 范围的数据，反之读取 `[offset%maxSize, 文件名+wrotePosition尾]` 

  先查 CQ 的原因：因为 CQ 时 CL 的索引，通过 CQ 查询 CL 更加快捷

* `if (bufferConsumeQueue != null)`：只有再 CQ 删除过期数据的逻辑执行时，条件才不成立，一般都是成立的

* `long nextPhyFileStartOffset = Long.MIN_VALUE`：下一个 commitLog 物理文件名，初始值为最小值

* `long maxPhyOffsetPulling = 0`：本次拉消息最后一条消息的物理偏移量

* `for ()`：**处理数据**，每次处理 20 字节处理字节数大于 16000 时跳出循环

* `offsetPy, sizePy, tagsCode`：读取 20 个字节后，获取消息物理偏移量、消息大小、消息 tagCode

* `boolean isInDisk = checkInDiskByCommitOffset(...)`：**检查消息是热数据还是冷数据**，false 为热数据

  * `long memory`：Broker 系统 40% 内存的字节数，写数据时内存不够会使用 LRU 算法淘汰数据，将淘汰数据持久化到磁盘
  * `return (maxOffsetPy - offsetPy) > memory`：返回 true 说明数据已经持久化到磁盘，为冷数据

* `if (this.isTheBatchFull())`：**控制是否跳出循环**

  * `if (0 == bufferTotal || 0 == messageTotal)`：本次 pull 消息未拉取到任何东西，需要外层 for 循环继续，返回 false

  * `if (maxMsgNums <= messageTotal)`：结果对象内消息数已经超过了最大消息数量，可以结束循环了

  * `if (isInDisk)`：冷数据

    `if ((bufferTotal + sizePy) > ...)`：冷数据一次 pull 请求最大允许获取 64kb 的消息

    `if (messageTotal > ...)`：冷数据一次 pull 请求最大允许获取8 条消息

  * `else`：热数据

    `if ((bufferTotal + sizePy) > ...)`：热数据一次 pull 请求最大允许获取 256kb 的消息

    `if (messageTotal > ...)`：冷数据一次 pull 请求最大允许获取 32 条消息

* `if (messageFilter != null)`：按照消息 tagCode 进行过滤

* `selectResult = this.commitLog.getMessage(offsetPy, sizePy)`：根据 CQ 消息物理偏移量和消息大小**到 commitLog 中查询这条 msg**

* `if (null == selectResult)`：条件成立说明 commitLog 执行了删除过期文件的定时任务，因为是先清理的 CL，所以 CQ 还有该索引数据

* `nextPhyFileStartOffset = this.commitLog.rollNextFile(offsetPy)`：获取包含该 offsetPy 的下一个数据文件的文件名

* `getResult.addMessage(selectResult)`：**将本次循环查询出来的 msg 加入到 getResult 内**

* `status = GetMessageStatus.FOUND`：查询状态设置为 FOUND

* `nextPhyFileStartOffset = Long.MIN_VALUE`：设置为最小值，跳过期 CQData 数据的逻辑

* `nextBeginOffset = offset + (i / ConsumeQueue.CQ_STORE_UNIT_SIZE)`：计算客户端下一次 pull 时使用的位点信息

* `getResult.setSuggestPullingFromSlave(diff > memory)`：**选择主从节点的建议**

  * `diff > memory => true`：表示本轮查询最后一条消息为冷数据，Broker 建议客户端下一次 pull 时到 slave 节点
  * `diff > memory => false`：表示本轮查询最后一条消息为热数据，Broker 建议客户端下一次 pull 时到 master 节点

* `getResult.setStatus(status)`：设置结果状态

* `getResult.setNextBeginOffset(nextBeginOffset)`：设置客户端下一次 pull 时的 offset

* `getResult.setMaxOffset(maxOffset)`：设置 queue 的最大 offset 和最小 offset

* `return getResult`：返回结果对象



***



#### Broker

BrokerStartup 启动方法

```java
public static void main(String[] args) {
    start(createBrokerController(args));
}
public static BrokerController start(BrokerController controller) {
    controller.start();	// 启动
}
```

BrokerStartup#createBrokerController：构造控制器，并初始化

* `final BrokerController controller()`：创建实例对象
* `boolean initResult = controller.initialize()`：控制器初始化
  * `this.registerProcessor()`：**注册了处理器，包括发送消息、拉取消息、查询消息等核心处理器**
  * `initialTransaction()`：初始化了事务服务，用于进行**事务回查**

BrokerController#start：核心启动方法

* `this.messageStore.start()`：**启动存储服务**

* `this.remotingServer.start()`：启动 Netty 通信服务

* `this.fileWatchService.start()`：启动文件监听服务

* `startProcessorByHa(messageStoreConfig.getBrokerRole())`：**启动事务回查**

* `this.scheduledExecutorService.scheduleAtFixedRate()`：每隔 30s 向 NameServer 上报 Topic 路由信息，**心跳机制**

  `BrokerController.this.registerBrokerAll(true, false, brokerConfig.isForceRegister())`



****
