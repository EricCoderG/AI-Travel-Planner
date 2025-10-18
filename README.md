# AI Travel Planner

这个文档主要是来说明这个项目如何运行

## 1.docker运行

在Release页面下载对应的tar文件
```
# x86_64 机器
docker load -i vite-web_v1.0.0_amd64.tar
docker run -d --name vite-web -p 80:80 vite-web:v1.0.0-amd64

# ARM64 机器
docker load -i vite-web_v1.0.0_arm64.tar
docker run -d --name vite-web -p 80:80 vite-web:v1.0.0-arm64

```

## 2.按照文档配置相关鉴权API KEY
文档是在NJU SE教学支持系统上提交的文档，在文档中有具体的秘钥和配置方法，在这里不再赘述