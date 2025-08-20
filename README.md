# Wikispeech

Wikispeech 是一个 [MediaWiki 扩展](https://www.mediawiki.org/wiki/Manual:Extensions)，提供文本转语音功能，允许用户朗读页面内容。它旨在让维基媒体项目对因各种原因存在阅读困难的人群更加友好和无障碍。

## 功能特性

相比于原版，具有以下特色：

- **浏览器 TTS 集成**：支持服务器端合成和基于浏览器的文本转语音，**无需再部署Speechoid后端！**
- **更简单的自定义设置**：新增设置按钮，调整语音速度、语音偏好和其他音频设置。
- **支持移动端：** 在vector2022皮肤下进一步做了优化。
- **中文优先：** 将中文的TTS服务往前排序。

## 安装

详细的安装说明请访问官方文档，与官方基本无异：
[MediaWiki.org 上的 Extension:Wikispeech](https://www.mediawiki.org/wiki/Extension:Wikispeech)

## 配置

该扩展可以通过 MediaWiki 的配置系统进行配置。主要设置包括：

- `$wgWikispeechUseBrowserTTS`：启用基于浏览器的文本转语音
- 语音和语言偏好设置

## 开发

### 文件结构

```
Wikispeech/
├── extension.json          # 扩展元数据
├── includes/              # PHP 后端代码
├── modules/               # JavaScript 前端代码
├── i18n/                  # 国际化文件
│   ├── *.json            # 界面消息
│   └── api/              # API 文档消息
├── sql/                   # 数据库模式
├── tests/                 # 测试文件
└── maintenance/           # 维护脚本
```

### 国际化

该扩展支持广泛的国际化，在 [`i18n/`](i18n/) 目录中有消息文件。翻译涵盖：

- 界面元素和控件
- API 文档
- 错误消息和通知
- 帮助文本和描述

新增相关文本主要覆盖了简中、繁中以及英文。

## 使用方法

### 对于读者

1. 导航到启用了 Wikispeech 的任何 MediaWiki 页面
2. 查找"朗读"选项卡或播放器界面
3. 点击开始文本转语音播放
4. 使用播放器控件暂停、跳过或调整设置
5. 访问语音设置来自定义您的收听体验

### 对于管理员

- 在 `LocalSettings.php` 中配置扩展设置
- 配置浏览器 TTS 设置

## 许可证

本项目采用 GNU 通用公共许可证 v2.0 许可。详情请参见 [`COPYING.txt`](COPYING.txt)。
