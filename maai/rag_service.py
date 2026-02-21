import os
from typing import List, Dict, Any
from dotenv import load_dotenv

from langchain_huggingface import HuggingFaceEndpoint, ChatHuggingFace
from langchain_community.embeddings.fastembed import FastEmbedEmbeddings
from langchain_chroma import Chroma
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import HumanMessage, AIMessage
from langchain_core.output_parsers import StrOutputParser

load_dotenv()

class PregnancyRAGService:
    def __init__(self, persist_directory: str = "vectordb"):
        # 1. Initialize LLM (Llama 3 via Hugging Face)
        llm_endpoint = HuggingFaceEndpoint(
            repo_id="meta-llama/Meta-Llama-3-8B-Instruct",
            task="text-generation",
            max_new_tokens=512,
            temperature=0.1,
            huggingfacehub_api_token=os.getenv("HUGGINGFACEHUB_API_TOKEN")
        )
        self.llm = ChatHuggingFace(llm=llm_endpoint)

        # 2. Initialize Vector DB
        embeddings = FastEmbedEmbeddings(model_name="BAAI/bge-small-en-v1.5")
        
        # Ensure vectordb exists and is populated from health_book.txt
        index_exists = os.path.exists(persist_directory) and any(os.listdir(persist_directory))
        if not index_exists:
            print(f"⚠️ VectorDB at {persist_directory} not found or empty. Initializing from health_book.txt...")
            from ingest import ingest_docs
            health_file = "health_book.txt"
            if os.path.exists(health_file):
                ingest_docs(health_file, persist_directory)
            else:
                print(f"❌ Error: {health_file} not found. RAG service will have no medical context.")

        self.vectordb = Chroma(
            persist_directory=persist_directory,
            embedding_function=embeddings,
            collection_name="pregnancy_docs"
        )
        self.retriever = self.vectordb.as_retriever(search_kwargs={"k": 5})

        # 3. Prompt - Structured for Human/AI messages
        self.rag_prompt = ChatPromptTemplate.from_messages([
            ("system", """You are a highly professional medical assistant specializing in pregnancy health named "Janani".
- Your goal is to provide clear, accurate, to the point and safe answers. 
- Keep your answers EXTREMELY BRIEF and CONCISE. 
- STICK TO A MAXIMUM OF 30 WORDS AND 300 CHARACTERS.
- Refrain from long explanations. Give direct advice.

HANDLING GREETINGS:
- If the user says "hello", "hi", or other greetings, respond warmly and ask how you can help.

MEDICAL RULES:
1. For ANY medical or health advice, answer ONLY from the provided CONTEXT. If the context is missing, say you don't know but offer support.
2. STICK STRICTLY to the patient's health data.
3. Ensure the answer is clear, professional, and compassionate.
4. To the point no need for long explanations."""),
            MessagesPlaceholder(variable_name="chat_history"),
            ("human", """CONTEXT:
{context}

PATIENT DATA:
{patient_data}

USER QUESTION:
{question}

JANANI RESPONSE:""")
        ])

    def ask_stream(self, query: str, patient_data: str = "None provided", chat_history: list = None):
        if chat_history is None:
            chat_history = []
            
        # 1. Retrieve
        docs = self.retriever.invoke(query)
        context = "\n\n".join([d.page_content for d in docs])
        
        # 2. Streaming Generation
        generation_chain = self.rag_prompt | self.llm | StrOutputParser()
        
        full_answer = ""
        for chunk in generation_chain.stream({
            "chat_history": chat_history,
            "context": context,
            "question": query,
            "patient_data": patient_data
        }):
            full_answer += chunk
            yield chunk

        # Return sources after stream (not possible in generator easily, handle in main)
        # We will expose a method to get sources for a query if needed, or just return them with the stream.
        # Let's just return the answer chunks for now.

    def get_context_and_sources(self, query: str):
        docs = self.retriever.invoke(query)
        context = "\n\n".join([d.page_content for d in docs])
        sources = list(set([d.metadata.get("source", "Unknown") for d in docs]))
        return context, sources

if __name__ == "__main__":
    # Quick test (Requires API Key in .env)
    service = PregnancyRAGService()
    res = service.ask("What should I do about morning sickness?", "Patient is allergic to ginger.")
    print(f"Answer: {res['answer']}")
    print(f"Sources: {res['sources']}")
