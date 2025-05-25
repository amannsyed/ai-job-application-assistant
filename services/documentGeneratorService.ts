
import { Document, Packer, Paragraph, TextRun, AlignmentType, BorderStyle, ExternalHyperlink, ISpacingProperties, IParagraphOptions, Numbering, Indent } from 'docx';
import { jsPDF } from 'jspdf';
import type { DocumentType } from '../types';
import { logger } from './loggingService';

const FONT_FAMILY = "Times New Roman";
const FONT_FAMILY_PDF = "times"; // jsPDF uses lowercase 'times' for Times New Roman
const REGULAR_FONT_SIZE_PT = 12;
const HEADER_FONT_SIZE_PT = 14;
// Removed COVER_LETTER_PARAGRAPH_SPACING_PT as general empty line handling will manage this.

const REGULAR_FONT_SIZE_DOCX = REGULAR_FONT_SIZE_PT * 2;
const HEADER_FONT_SIZE_DOCX = HEADER_FONT_SIZE_PT * 2;
// const COVER_LETTER_PARAGRAPH_SPACING_DOCX = COVER_LETTER_PARAGRAPH_SPACING_PT * 20; // This was tied to the removed PDF constant

const URL_REGEX = /\b((?:https?|ftp):\/\/[-\w@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-\w()@:%_\+.~#?&//=]*))\b/g;
const BULLET_POINT_REGEX = /^(\*|-)\s+(.*)/;


interface TextSegment {
  text: string;
  bold?: boolean;
  isHeader?: boolean;
  isSeparator?: boolean;
  isBulletPoint?: boolean;
  bulletLevel?: number; 
  url?: string;
}

const parseLineForFormatting = (line: string): TextSegment[] => {
  if (line.trim() === '---') {
    return [{ text: '', isSeparator: true }];
  }

  const bulletMatch = line.match(BULLET_POINT_REGEX);
  if (bulletMatch) {
    const bulletContent = bulletMatch[2];
    const contentSegments = parseNestedText(bulletContent);
    if (contentSegments.length > 0) {
        return contentSegments.map(s => ({...s, isBulletPoint: true}));
    } else { 
        return [{ text: '', isBulletPoint: true, bold: false}];
    }
  }

  const headerMatch = line.match(/^\*\*(.+?)\*\*$/);
  if (headerMatch && headerMatch[1].toUpperCase() === headerMatch[1] && /^[A-Z\s]+$/.test(headerMatch[1])) {
    return [{ text: headerMatch[1].trim(), isHeader: true, bold: true }];
  }
  
  return parseNestedText(line);
};

const parseNestedText = (text: string): TextSegment[] => {
  let segments: TextSegment[] = [];
  const boldParts = text.split('**');
  let isCurrentlyBold = false;

  boldParts.forEach((part, index) => {
    if (part === "" && index < boldParts.length -1) { 
        isCurrentlyBold = !isCurrentlyBold;
        return;
    }
    let remainingTextInPart = part;
    let match;
    URL_REGEX.lastIndex = 0; 

    while ((match = URL_REGEX.exec(remainingTextInPart)) !== null) {
      const url = match[0];
      const precedingText = remainingTextInPart.substring(0, match.index);
      if (precedingText) {
        segments.push({ text: precedingText, bold: isCurrentlyBold });
      }
      segments.push({ text: url, bold: false, url: url }); 
      remainingTextInPart = remainingTextInPart.substring(match.index + url.length);
      URL_REGEX.lastIndex = 0; 
    }
    if (remainingTextInPart) {
      segments.push({ text: remainingTextInPart, bold: isCurrentlyBold });
    }
    if(index < boldParts.length -1 ) isCurrentlyBold = !isCurrentlyBold; 
  });
  
  return segments.filter(s => s.text !== "" || s.isSeparator || s.isHeader || s.isBulletPoint);
}


const createDocxElements = (content: string, documentType: DocumentType): Paragraph[] => {
  logger.addLog('DocGen', 'createDocxElements', `Creating DOCX elements for type: ${documentType}`);
  const paragraphs: Paragraph[] = [];
  const lines = content.split('\n');

  lines.forEach((line) => {
    const segments = parseLineForFormatting(line);
    
    const baseParagraphOptions: Omit<IParagraphOptions, 'children'> = { 
        spacing: { after: 100 }, // Default small spacing after paragraphs
        alignment: (documentType === 'coverLetter' || documentType === 'resume') ? AlignmentType.JUSTIFIED : AlignmentType.LEFT,
    };
    
    if (segments.length === 0 && line.trim() === '') { 
        // Handle deliberate empty lines for spacing (e.g., between paragraphs if AI outputs them)
        // For cover letter, this allows more natural paragraph spacing if AI uses double newlines.
        paragraphs.push(new Paragraph({ 
            children: [], 
            // Using a slightly larger spacing for empty lines in cover letters for readability,
            // otherwise use a minimal one for other docs if empty lines are structural.
            spacing: { after: documentType === 'coverLetter' ? (REGULAR_FONT_SIZE_PT * 10) : 100 } // e.g. 12pt font * 10 = 120 twentieths of a point
        }));
        return;
    }
    
    const firstSegment = segments[0]; 

    if (firstSegment?.isSeparator) {
      paragraphs.push(new Paragraph({
        border: { bottom: { color: "auto", space: 1, style: BorderStyle.SINGLE, size: 6 }},
        spacing: { before: 100, after: 200 }, 
      }));
      return;
    }

    if (firstSegment?.isHeader) {
      paragraphs.push(new Paragraph({
        children: [
          new TextRun({
            text: firstSegment.text,
            font: FONT_FAMILY,
            size: HEADER_FONT_SIZE_DOCX,
            bold: true,
          }),
        ],
        spacing: { after: 120, before: 240 }, 
        alignment: AlignmentType.LEFT, 
      }));
      return;
    }
    
    let finalParagraphOptions: Omit<IParagraphOptions, 'children'>;

    if (firstSegment?.isBulletPoint) {
        finalParagraphOptions = {
            spacing: baseParagraphOptions.spacing, 
            numbering: { 
                reference: "default-bullet-points", 
                level: 0, 
            },
            alignment: AlignmentType.LEFT, 
        };
    } else {
        finalParagraphOptions = { ...baseParagraphOptions };
    }
    
    const textRuns: (TextRun | ExternalHyperlink)[] = segments.map(segment => {
      if (segment.url) {
        return new ExternalHyperlink({
          children: [
            new TextRun({
              text: segment.text, 
              style: "Hyperlink", 
            }),
          ],
          link: segment.url, 
        });
      }
      return new TextRun({
        text: segment.text,
        font: FONT_FAMILY,
        size: REGULAR_FONT_SIZE_DOCX,
        bold: segment.bold,
      });
    });

    if (textRuns.length > 0) {
      paragraphs.push(new Paragraph({ children: textRuns, ...finalParagraphOptions }));
    } else if (line.trim() !== '' && !firstSegment?.isBulletPoint) { 
       paragraphs.push(new Paragraph({ children: [new TextRun(line)], ...finalParagraphOptions }));
    } else if (firstSegment?.isBulletPoint && textRuns.length === 0) { 
       paragraphs.push(new Paragraph({ children: [new TextRun('')], ...finalParagraphOptions }));
    }
  });
  logger.addLog('DocGen', 'createDocxElements', `Generated ${paragraphs.length} paragraphs for DOCX.`);
  return paragraphs;
};


export const downloadDocx = async (content: string, fileName: string, documentType: DocumentType): Promise<void> => {
  logger.addLog('DocGen', 'downloadDocx', `Attempting to download DOCX: ${fileName}`, { type: documentType });
  const docxElements = createDocxElements(content, documentType);
  const doc = new Document({
    numbering: { 
        config: [
            {
                reference: "default-bullet-points",
                levels: [
                    {
                        level: 0,
                        format: "bullet",
                        text: "\u2022", 
                        alignment: AlignmentType.LEFT,
                        style: {
                            paragraph: {
                                indent: { left: 720, hanging: 360 }, 
                            },
                        },
                    },
                ],
            },
        ],
    },
    sections: [{
      properties: {},
      children: docxElements,
    }],
    styles: {
      paragraphStyles: [
        {
          id: "Normal", 
          name: "Normal",
          paragraph: { 
            spacing: { after: 100 }, 
            alignment: AlignmentType.JUSTIFIED, 
          },
          run: { 
            font: FONT_FAMILY,
            size: REGULAR_FONT_SIZE_DOCX,
          },
        },
      ],
      characterStyles: [
        {
          id: 'Hyperlink',
          name: 'Hyperlink Style', 
          run: {
            color: '0563C1', 
            underline: { type: 'single', color: '0563C1' },
          },
        },
      ],
    },
  });

  try {
    const blob = await Packer.toBlob(doc);
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
    logger.addLog('DocGen', 'downloadDocx', `DOCX file ${fileName} download initiated successfully.`);
  } catch (error) {
    logger.addLog('DocGen', 'downloadDocx', `Error generating DOCX: ${fileName}`, { error: String(error) }, 'ERROR');
    console.error("Error generating DOCX:", error);
    throw new Error("Failed to generate DOCX file.");
  }
};

export const downloadPdf = (content: string, fileName: string, documentType: DocumentType): void => {
  logger.addLog('DocGen', 'downloadPdf', `Attempting to download PDF: ${fileName}`, { type: documentType });
  try {
    const pdf = new jsPDF({ unit: "pt", format: "a4" });
    const lines = content.split('\n');
    
    const margin = 50;
    const pageHeight = pdf.internal.pageSize.height;
    const usableWidth = pdf.internal.pageSize.width - 2 * margin;
    let yPosition = margin;
    const bulletPointSymbol = "\u2022"; 
    const textAfterBulletIndent = 25; 
    const defaultLineHeight = REGULAR_FONT_SIZE_PT * 1.2;

    const checkPageBreak = (neededHeight: number) => {
      if (yPosition + neededHeight > pageHeight - margin) {
        pdf.addPage();
        yPosition = margin;
        logger.addLog('DocGen', 'downloadPdf.checkPageBreak', 'Added new page to PDF.');
      }
    };

    lines.forEach((line) => {
      const segments = parseLineForFormatting(line);
      const firstSegment = segments[0];
      let isLineParagraphContent = !firstSegment?.isHeader && !firstSegment?.isSeparator && !firstSegment?.isBulletPoint && line.trim() !== '';

      if (segments.length === 0 && line.trim() === '') { // Handle empty line for paragraph spacing
        checkPageBreak(defaultLineHeight); 
        yPosition += defaultLineHeight;
        return;
      }
      
      if (firstSegment?.isSeparator) {
        checkPageBreak(10 + 5); 
        yPosition += 5; 
        pdf.setDrawColor(0); 
        pdf.setLineWidth(0.5);
        pdf.line(margin, yPosition, pdf.internal.pageSize.width - margin, yPosition);
        yPosition += 5 + defaultLineHeight; // Space after line + move to next line position
        return;
      }

      let currentX = margin;
      let lineMaxSegmentHeight = defaultLineHeight;
      
      if (firstSegment?.isHeader) {
        checkPageBreak(HEADER_FONT_SIZE_PT * 1.2);
        pdf.setFont(FONT_FAMILY_PDF, "bold");
        pdf.setFontSize(HEADER_FONT_SIZE_PT);
        pdf.setTextColor(0, 0, 0);
        const headerTextLines = pdf.splitTextToSize(firstSegment.text, usableWidth);
        headerTextLines.forEach((textLine: string) => {
          checkPageBreak(HEADER_FONT_SIZE_PT * 1.2);
          pdf.text(textLine, margin, yPosition, { align: 'left' });
          yPosition += HEADER_FONT_SIZE_PT * 1.2;
        });
        return; // Move to next line in source content
      }
      
      if (isLineParagraphContent) {
        // For justification, concatenate all text from segments on this line.
        // This sacrifices inline styling (bold/links) within the justified block for jsPDF.
        const fullLineText = segments.map(s => s.text).join('');
        pdf.setFont(FONT_FAMILY_PDF, "normal"); // Justified text is normal weight
        pdf.setFontSize(REGULAR_FONT_SIZE_PT);
        pdf.setTextColor(0, 0, 0);
        
        const textLines = pdf.splitTextToSize(fullLineText, usableWidth);
        textLines.forEach((textLine: string) => {
          checkPageBreak(defaultLineHeight);
          pdf.text(textLine, margin, yPosition, { align: 'justify', maxWidth: usableWidth });
          yPosition += defaultLineHeight;
        });
        return; // Processed this line, move to next source line
      }

      // Handling for bullet points and other multi-segment lines (typically left-aligned)
      if (firstSegment?.isBulletPoint) {
          checkPageBreak(defaultLineHeight); 
          pdf.setFont(FONT_FAMILY_PDF, "normal"); 
          pdf.setFontSize(REGULAR_FONT_SIZE_PT);
          pdf.setTextColor(0,0,0); 
          pdf.text(bulletPointSymbol, currentX, yPosition);
          currentX += textAfterBulletIndent; 
      }

      segments.forEach((segment, segmentIndex) => {
        const fontSize = REGULAR_FONT_SIZE_PT; // Headers are handled above
        const fontWeight = segment.bold ? 'bold' : 'normal';
        
        pdf.setFont(FONT_FAMILY_PDF, fontWeight);
        pdf.setFontSize(fontSize);

        if (segment.url) {
          pdf.setTextColor(0, 0, 255); 
        } else {
          pdf.setTextColor(0, 0, 0); 
        }

        const textToRender = segment.text;
        const availableWidthForSegment = usableWidth - (currentX - margin);
        const splitText = pdf.splitTextToSize(textToRender, availableWidthForSegment);

        splitText.forEach((textLine: string, idx: number) => {
          checkPageBreak(defaultLineHeight); 
          if (idx > 0) { 
            yPosition += lineMaxSegmentHeight > 0 ? lineMaxSegmentHeight : defaultLineHeight;
            currentX = firstSegment?.isBulletPoint ? margin + textAfterBulletIndent : margin; 
            lineMaxSegmentHeight = defaultLineHeight; 
          }
          
          if (segment.url) {
            pdf.textWithLink(textLine, currentX, yPosition, { url: segment.url });
            const textWidth = pdf.getStringUnitWidth(textLine) * fontSize / pdf.internal.scaleFactor;
            pdf.setDrawColor(0, 0, 255); 
            pdf.line(currentX, yPosition + 1.5, currentX + textWidth, yPosition + 1.5); 
            pdf.setDrawColor(0); 
          } else {
            pdf.text(textLine, currentX, yPosition, {}); // Default (left) align from currentX
          }
          
          if (idx === 0 && segmentIndex < segments.length -1 && splitText.length === 1) { 
             currentX += pdf.getStringUnitWidth(textLine) * fontSize / pdf.internal.scaleFactor + (fontWeight === 'bold' ? 1 : 2); 
          }
          lineMaxSegmentHeight = Math.max(lineMaxSegmentHeight, defaultLineHeight);
        });
        
        if (segment.url) pdf.setTextColor(0,0,0); 
      });
      yPosition += lineMaxSegmentHeight; 
    });

    pdf.save(fileName);
    logger.addLog('DocGen', 'downloadPdf', `PDF file ${fileName} download initiated successfully.`);
  } catch (error) {
    logger.addLog('DocGen', 'downloadPdf', `Error generating PDF: ${fileName}`, { error: String(error) }, 'ERROR');
    console.error("Error generating PDF:", error);
    throw new Error(`Failed to generate PDF file: ${error instanceof Error ? error.message : String(error)}`);
  }
};
