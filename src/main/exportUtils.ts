import PDFDocument from 'pdfkit';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import fs from 'fs';
import { dialog, BrowserWindow } from 'electron';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface Chat {
  name: string;
  messages: ChatMessage[];
}

export const exportUtils = {
    // Экспорт в PDF
    async exportToPDF(chat: Chat, mainWindow: BrowserWindow) {
        const { filePath } = await dialog.showSaveDialog(mainWindow, {
            title: 'Сохранить чат как PDF',
            defaultPath: `${chat.name}.pdf`,
            filters: [{ name: 'PDF файлы', extensions: ['pdf'] }]
        });

        if (!filePath) return;

        return new Promise((resolve, reject) => {
            const doc = new PDFDocument({
                size: 'A4',
                margins: { top: 50, left: 50, right: 50, bottom: 50 }
            });

            const stream = fs.createWriteStream(filePath);
            doc.pipe(stream);

            // Заголовок
            doc.fontSize(20)
               .font('Helvetica-Bold')
               .text(chat.name, { align: 'center' });
            
            doc.moveDown();
            doc.fontSize(10)
               .font('Helvetica')
               .fillColor('#666666')
               .text(new Date().toLocaleString('ru-RU'), { align: 'center' });
            
            doc.moveDown(2);

            // Сообщения
            chat.messages.forEach((message: ChatMessage, index: number) => {
                if (index > 0) doc.moveDown();

                // Роль
                doc.fontSize(12)
                   .font('Helvetica-Bold')
                   .fillColor(message.role === 'user' ? '#3b82f6' : '#10b981')
                   .text(message.role === 'user' ? 'Вы:' : 'Ассистент:', { continued: false });

                // Контент
                doc.fontSize(11)
                   .font('Helvetica')
                   .fillColor('#000000')
                   .text(message.content, {
                       align: 'justify',
                       indent: 0,
                       lineGap: 2
                   });

                // Разделитель
                if (index < chat.messages.length - 1) {
                    doc.moveDown();
                    doc.strokeColor('#e5e7eb')
                       .lineWidth(0.5)
                       .moveTo(50, doc.y)
                       .lineTo(doc.page.width - 50, doc.y)
                       .stroke();
                    doc.moveDown();
                }
            });

            doc.end();

            stream.on('finish', () => resolve(filePath));
            stream.on('error', reject);
        });
    },

    // Экспорт в DOCX
    async exportToDOCX(chat: Chat, mainWindow: BrowserWindow) {
        const { filePath } = await dialog.showSaveDialog(mainWindow, {
            title: 'Сохранить чат как Word документ',
            defaultPath: `${chat.name}.docx`,
            filters: [{ name: 'Word документы', extensions: ['docx'] }]
        });

        if (!filePath) return;

        const children = [];

        // Заголовок
        children.push(
            new Paragraph({
                text: chat.name,
                heading: HeadingLevel.HEADING_1,
                alignment: 'center'
            })
        );

        children.push(
            new Paragraph({
                text: new Date().toLocaleString('ru-RU'),
                alignment: 'center',
                spacing: { after: 400 }
            })
        );

        // Сообщения
        chat.messages.forEach((message: ChatMessage) => {
            children.push(
                new Paragraph({
                    children: [
                        new TextRun({
                            text: message.role === 'user' ? 'Вы: ' : 'Ассистент: ',
                            bold: true,
                            color: message.role === 'user' ? '3b82f6' : '10b981'
                        })
                    ],
                    spacing: { before: 200 }
                })
            );

            // Разбиваем контент на параграфы
            const paragraphs = message.content.split('\n\n');
            paragraphs.forEach((para: string) => {
                if (para.trim()) {
                    children.push(
                        new Paragraph({
                            text: para,
                            spacing: { after: 200 }
                        })
                    );
                }
            });
        });

        const doc = new Document({
            sections: [{
                properties: {},
                children: children
            }]
        });

        const buffer = await Packer.toBuffer(doc);
        fs.writeFileSync(filePath, buffer);
        return filePath;
    },

    // Экспорт в HTML
    async exportToHTML(chat: Chat, mainWindow: BrowserWindow) {
        const { filePath } = await dialog.showSaveDialog(mainWindow, {
            title: 'Сохранить чат как HTML',
            defaultPath: `${chat.name}.html`,
            filters: [{ name: 'HTML файлы', extensions: ['html'] }]
        });

        if (!filePath) return;

        const html = `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${chat.name}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background: #f9fafb;
        }
        .header {
            text-align: center;
            margin-bottom: 40px;
        }
        h1 {
            color: #1f2937;
            margin-bottom: 10px;
        }
        .date {
            color: #6b7280;
            font-size: 14px;
        }
        .message {
            margin-bottom: 20px;
            padding: 15px;
            border-radius: 8px;
            background: white;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .user {
            background: #3b82f6;
            color: white;
            margin-left: 100px;
        }
        .assistant {
            margin-right: 100px;
        }
        .role {
            font-weight: bold;
            margin-bottom: 8px;
        }
        .user .role {
            color: white;
        }
        .assistant .role {
            color: #10b981;
        }
        .content {
            white-space: pre-wrap;
            line-height: 1.6;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>${chat.name}</h1>
        <div class="date">${new Date().toLocaleString('ru-RU')}</div>
    </div>
    ${chat.messages.map((msg: ChatMessage) => `
        <div class="message ${msg.role}">
            <div class="role">${msg.role === 'user' ? 'Вы' : 'Ассистент'}</div>
            <div class="content">${msg.content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
        </div>
    `).join('')}
</body>
</html>`;

        fs.writeFileSync(filePath, html, 'utf8');
        return filePath;
    }
};