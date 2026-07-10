# 示例

## demo-project

一个用 PMSpec CLI 真实生成的示例工作区（电商后台）：2 个 Epic、3 个 Feature、2 个 Story，
含团队配置、估算与进行中的状态。

进入目录体验：

```bash
cd examples/demo-project
pmspec list                     # 三层结构总览
pmspec show EPIC-001            # Epic 详情与子项进度
pmspec stats --by-assignee      # 负载视图
pmspec validate                 # 校验通过
```

也可以直接阅读 `demo-project/pmspace/` 下的 Markdown 文件了解存储格式——
它们就是 PMSpec 的全部数据。
