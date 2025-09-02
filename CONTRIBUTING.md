# 贡献指南

感谢您对设备管理小程序项目的关注与支持！我们欢迎任何形式的贡献，包括但不限于bug修复、功能改进、文档完善等。

## 贡献流程

1. **Fork 仓库**
   - 点击GitHub仓库页面右上角的"Fork"按钮，创建自己的仓库副本

2. **克隆仓库到本地**
   ```bash
   git clone https://github.com/your-username/equipment-management-miniprogram.git
   cd equipment-management-miniprogram
   ```

3. **创建分支**
   - 从`develop`分支创建新的功能分支
   ```bash
   git checkout develop
   git checkout -b feature/your-feature-name
   ```
   - 分支命名规范：
     - 新功能：`feature/功能名称`
     - Bug修复：`fix/问题描述`
     - 文档更新：`docs/文档名称`

4. **开发与提交**
   - 进行代码修改，确保符合项目代码规范
   - 提交代码时，使用清晰的提交信息
   ```bash
   git commit -m "feat: 添加XXX功能"
   ```
   - 提交信息规范：
     - `feat`: 新功能
     - `fix`:  bug修复
     - `docs`: 文档更新
     - `style`: 代码格式调整
     - `refactor`: 代码重构
     - `test`: 测试相关
     - `chore`: 构建过程或辅助工具变动

5. **同步上游代码**
   - 在提交PR前，同步上游仓库的最新代码
   ```bash
   git remote add upstream https://github.com/original-owner/equipment-management-miniprogram.git
   git fetch upstream
   git merge upstream/develop
   ```

6. **提交Pull Request**
   - 将你的分支推送到自己的仓库
   ```bash
   git push origin feature/your-feature-name
   ```
   - 在GitHub页面上创建Pull Request，目标分支选择`develop`

## 代码规范

1. 遵循JavaScript Standard Style规范
2. 微信小程序开发遵循官方开发规范
3. 代码注释清晰，特别是复杂逻辑部分
4. 新增功能需要添加相应的测试代码
5. 确保所有代码通过ESLint检查

## Issue反馈

1. 发现bug或有功能建议时，请提交Issue
2. 提交bug报告时，请包含：
   - 复现步骤
   - 预期结果
   - 实际结果
   - 截图（如有）
   - 环境信息（微信开发者工具版本、操作系统等）
3. 提交功能建议时，请说明功能用途和实现思路

## 行为准则

- 保持友好和尊重的沟通
- 聚焦于问题本身，而非个人
- 接受建设性的批评
- 对自己的代码负责

再次感谢您的贡献，让我们一起完善这个项目！
