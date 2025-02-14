import { execSync } from 'child_process'
import fs from 'fs'
import OpenAI from 'openai'

const deepSeekConfig = {}

if (fs.existsSync('.deepseek')) {
    fs.readFileSync('.deepseek', { encoding: 'utf-8' })
        ?.trim()
        ?.split(/\s*\n\s*/)
        ?.forEach(i => {
            const [key, value] = i.split(/\s*=\s*/)
            if (key && value) {
                deepSeekConfig[key] = value
            }
        })
}

const openai = new OpenAI({
    baseURL: deepSeekConfig.baseURL,
    apiKey: deepSeekConfig.apiKey
})

// 获取 Git 暂存区中的变更部分
const getStagedChanges = () => {
    const diff = execSync('git diff').toString()
    return diff
}

// AI 审查逻辑
const runAiReview = async diffStr => {
    try {
        // 读取文件内容
        const prompt = `
要审查的代码的diff：

${diffStr}

作为代码审查员，您的任务是：

- 审查补丁中的代码更改（diff）并提供反馈。
- 如果有任何错误，请突出显示它们。
- 代码是否符合提交消息中的内容？
- 不要突出显示小问题和细节。
- 如果有多个评论，请使用项目符号。
- 如果没有提供建议，请给出良好的反馈。
- 请使用中文给出反馈。
- 给出修改后的代码片段，尽量小的修改。

输出内容时，由于是在命令行中运行，请输出纯文本，不用Markdown格式。缩进可以用tab或多个空格来填充。
`
        console.log('正在调用deepseek ai进行代码审查...')
        console.time('ai用时：')
        const response = await openai.chat.completions.create({
            messages: [
                { role: 'system', content: `你是一位资深代码审查员，请根据下面的代码更改给出反馈。` },
                { role: 'user', content: `${prompt}` }
            ],
            model: deepSeekConfig.model
        })

        console.timeEnd('ai用时：')
        console.log(response?.choices?.[0]?.message?.content)
    } catch (err) {
        console.error(`Error reviewing `, err)
    }
}

// 主函数
const main = async () => {
    const diff = getStagedChanges()

    if (!diff) {
        console.log('没有需要审查的代码。')
        return
    }

    await runAiReview(diff)
}

main()
