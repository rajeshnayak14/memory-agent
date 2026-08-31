import os
from contextlib import ExitStack

from dotenv import load_dotenv
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langgraph.checkpoint.postgres import PostgresSaver
from langgraph.store.postgres import PostgresStore

load_dotenv()

database_url = os.getenv("DATABASE_URL")

if not database_url:
    raise ValueError("DATABASE_URL is not set in .env")


embeddings = GoogleGenerativeAIEmbeddings(
    model="models/gemini-embedding-001",
    output_dimensionality=1536,
)


stack = ExitStack()


store = stack.enter_context(
    PostgresStore.from_conn_string(
        database_url,
        index={
            "dims": 1536,
            "embed": embeddings,
        },
    )
)


checkpointer = stack.enter_context(
    PostgresSaver.from_conn_string(database_url)
)


store.setup()
checkpointer.setup()
