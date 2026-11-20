---
title: "增加健康检查，完整脚本路径"
date: 2026-08-04
planet: blog-dev
tags: ["后端", "实战"]
summary: "在 WSL Ubuntu 终端中，找个目录（比如 ~/docker/kafka/）："
private: false
---
## 第 1 步：创建 docker-compose.yml

在 WSL Ubuntu 终端中，找个目录（比如 `~/docker/kafka/`）：

```bash
mkdir -p ~/docker/kafka && cd ~/docker/kafka
```

在 **WSL Ubuntu 终端**中执行：

```bash
ip route show default | awk '/default/ {print $3}'
```

创建 `docker-compose.yml`：使用Apache官方的Kafka镜像

```yaml
cat > docker-compose.yml <<'EOF'
services:
  kafka:
    image: apache/kafka:3.8.0
    container_name: blog-kafka
    restart: unless-stopped
    ports:
      - "9092:9092"
    environment:
      KAFKA_CLUSTER_ID: "blog-kraft-cluster-001"
      KAFKA_NODE_ID: 1
      KAFKA_PROCESS_ROLES: broker,controller
      KAFKA_CONTROLLER_QUORUM_VOTERS: 1@kafka:9093
      KAFKA_CONTROLLER_LISTENER_NAMES: CONTROLLER
      KAFKA_LISTENERS: PLAINTEXT_HOST://0.0.0.0:9092,PLAINTEXT://0.0.0.0:9094,CONTROLLER://0.0.0.0:9093
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: PLAINTEXT_HOST:PLAINTEXT,PLAINTEXT:PLAINTEXT,CONTROLLER:PLAINTEXT
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT_HOST://localhost:9092,PLAINTEXT://kafka:9094
      KAFKA_INTER_BROKER_LISTENER_NAME: PLAINTEXT
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
    volumes:
      - kafka_data:/opt/kafka/data

  kafka-ui:
    image: provectuslabs/kafka-ui:latest
    container_name: blog-kafka-ui
    restart: unless-stopped
    ports:
      - "8081:8080"
    environment:
      KAFKA_CLUSTERS_0_NAME: blog-cluster
      KAFKA_CLUSTERS_0_BOOTSTRAPSERVERS: kafka:9094
    depends_on:
      - kafka

volumes:
  kafka_data:
EOF
```

或者：健康(kafka 业务就绪，kafka‑ui 此时才会启动)

```java
cat > docker-compose.yml <<'EOF'
services:
  kafka:
    image: apache/kafka:3.8.0
    container_name: blog-kafka
    restart: unless-stopped
    ports:
      - "9092:9092"
    environment:
      KAFKA_CLUSTER_ID: "blog-kraft-cluster-001"
      KAFKA_NODE_ID: 1
      KAFKA_PROCESS_ROLES: broker,controller
      KAFKA_CONTROLLER_QUORUM_VOTERS: 1@kafka:9093
      KAFKA_CONTROLLER_LISTENER_NAMES: CONTROLLER
      KAFKA_LISTENERS: PLAINTEXT_HOST://0.0.0.0:9092,PLAINTEXT://0.0.0.0:9094,CONTROLLER://0.0.0.0:9093
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: PLAINTEXT_HOST:PLAINTEXT,PLAINTEXT:PLAINTEXT,CONTROLLER:PLAINTEXT
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT_HOST://localhost:9092,PLAINTEXT://kafka:9094
      KAFKA_INTER_BROKER_LISTENER_NAME: PLAINTEXT
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
    volumes:
      - kafka_data:/opt/kafka/data
    # 增加健康检查，完整脚本路径
    healthcheck:
      test: ["CMD-SHELL","/opt/kafka/bin/kafka-topics.sh --bootstrap-server 127.0.0.1:9094 --list"]
      interval: 10s
      timeout: 8s
      retries: 12

  kafka-ui:
    image: provectuslabs/kafka-ui:latest
    container_name: blog-kafka-ui
    restart: unless-stopped
    ports:
      - "8081:8080"
    environment:
      KAFKA_CLUSTERS_0_NAME: blog-cluster
      KAFKA_CLUSTERS_0_BOOTSTRAPSERVERS: kafka:9094
    depends_on:
      kafka:
        condition: service_healthy

volumes:
  kafka_data:
EOF
```

|       做法       |                             表现                             |            适用场景            |
| :--------------: | :----------------------------------------------------------: | :----------------------------: |
| 不加healthcheck  |    compup 立刻完成，刚启动瞬间 UI 无集群，等待几十秒自愈     |    本地开发，省事，少写配置    |
| 加上 healthcheck | comp up 不会立刻完成，等待 kafka 业务就绪后才拉起 kafka‑ui，启动慢一点，打开页面直接可用 | 追求自动化、面试演示、生产环境 |

------

## 第 2 步：启动容器

```bash
# 1. 拉取镜像（首次需要几分钟）
docker compose pull

# 2. 启动（-d 后台运行）
docker compose up -d

# 3. 查看启动状态
docker compose ps
```

看到两个容器都是 `Up` 状态就成功了。

- 如果出错，有一个Restarting，确认yml配置问题就执行以下步骤：

1. 覆盖 yml
2. **彻底清理旧数据**

```
docker compose down -v
```

   3.启动

```
docker compose up -d
```

​    4.观察状态

```
docker compose ps
```

------

## 第 3 步：验证 Kafka 是否正常

### 3.1 进入 Kafka 容器

```bash
docker exec -it blog-kafka bash
```

### 3.2 创建 Topic

```bash
# 创建topic
/opt/kafka/bin/kafka-topics.sh --bootstrap-server localhost:9092 \
  --create --topic test-topic \
  --partitions 3 --replication-factor 1
```

### 3.3 查看 Topic 列表

```bash
/opt/kafka/bin/kafka-topics.sh --bootstrap-server localhost:9092 --list
```

### 3.4 发送消息（生产者）

```bash
# 运行生产者，终端会变成交互模式，输入消息回车发送
/opt/kafka/bin/kafka-console-producer.sh --bootstrap-server localhost:9092 --topic test-topic
```

输入几行消息：

```
hello kafka
this is my first message
测试中文消息
```

按 `Ctrl+C` 退出生产者。

### 3.5 消费消息（消费者）

```bash
# --from-beginning 从最早的消息开始消费
/opt/kafka/bin/kafka-console-consumer.sh --bootstrap-server localhost:9092 \
  --topic test-topic --from-beginning
```

应该能看到刚才发送的三条消息。按 `Ctrl+C` 退出。

### 3.6 查看 Topic 详细信息

```bash
/opt/kafka/bin/kafka-topics.sh --bootstrap-server localhost:9092 --describe --topic test-topic
```

输出示例：

```
Topic: test-topic	TopicId: xxx	PartitionCount: 3	ReplicationFactor: 1
Topic: test-topic	Partition: 0	Leader: 1	Replicas: 1	Isr: 1
Topic: test-topic	Partition: 1	Leader: 1	Replicas: 1	Isr: 1
Topic: test-topic	Partition: 2	Leader: 1	Replicas: 1	Isr: 1
```

### 3.7 退出容器

```bash
exit
```

------

## 第 4 步：访问 Kafka UI 管理界面

浏览器打开：**[http://localhost:8081](http://localhost:8081/)**

你会看到：

- 左侧菜单能看到 `blog-cluster` 集群
- 点击 Topics 可以看到所有 Topic
- 支持在线查看消息、创建 Topic、查看消费者组等

------

## 关键配置说明

| 配置项                                | 值                           | 为什么                                                       |
| :------------------------------------ | :--------------------------- | :----------------------------------------------------------- |
| `KAFKA_CFG_PROCESS_ROLES`             | `broker,controller`          | KRaft 模式，单节点同时承担 Broker 和 Controller              |
| `KAFKA_CFG_ADVERTISED_LISTENERS`      | `PLAINTEXT://localhost:9092` | 客户端连接时 Kafka 返回这个地址，Docker Desktop 已做端口映射 |
| `KAFKA_CFG_AUTO_CREATE_TOPICS_ENABLE` | `false`                      | 禁止自动创建 Topic，避免生产环境 Topic 满天飞                |
| `KAFKA_CFG_NUM_PARTITIONS`            | `3`                          | 默认 3 分区，兼顾并行度和单节点资源                          |

------

## 为什么不用 ZooKeeper？

Kafka 3.3+ 正式支持 **KRaft 模式**，用自身 Raft 协议管理元数据，不再需要 ZooKeeper。生产环境的新部署都推荐 KRaft 模式，架构更简单、运维成本更低。

完成后你的 Docker Desktop 里会有 4 个容器：`blog-redis`、`blog-rabbitmq`、`blog-kafka`、`blog-kafka-ui`，统一管理。
