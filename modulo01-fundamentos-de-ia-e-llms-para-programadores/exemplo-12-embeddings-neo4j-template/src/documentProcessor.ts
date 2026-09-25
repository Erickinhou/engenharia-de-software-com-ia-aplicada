import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter"
import { type TextSplitterConfig } from './config.ts'


export class DocumentProcessor {
  private pdfPath: string;
  private textSplitterConfig: TextSplitterConfig;

  constructor(pdfPath: string, textSplitterConfig: TextSplitterConfig ){
    this.pdfPath = pdfPath;
    this.textSplitterConfig = textSplitterConfig;
  }
  async loadAndSplit(){
    const loader = new PDFLoader(this.pdfPath);
    const rawDocuments = await loader.load();
    console.log(`📁 Loaded ${rawDocuments.length} from PDF` )
    const splitter = new RecursiveCharacterTextSplitter(this.textSplitterConfig)
    const documents = await splitter.splitDocuments(rawDocuments)
    console.log(`Splitting into ${documents.length} chunks`)

    // Coverting object Document from langchain to default object in js
    return documents.map( doc => ({
      ...doc,
      metadata: {
        source: doc.metadata.source
      }
    }));
  }
}