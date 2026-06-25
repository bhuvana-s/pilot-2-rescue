"""
Architecture diagram for the Enterprise AI Pilot Rescue Kit.

Generates docs/architecture.png with official AWS (Bedrock) and MongoDB icons.

Run:
    pip install diagrams        # requires graphviz `dot` on PATH
    python docs/architecture.py
"""
from diagrams import Diagram, Cluster, Edge
from diagrams.aws.ml import Bedrock
from diagrams.onprem.database import Mongodb
from diagrams.onprem.client import Users
from diagrams.programming.language import Nodejs, JavaScript
from diagrams.generic.storage import Storage

graph_attr = {
    "fontsize": "20",
    "labelloc": "t",
    "pad": "0.6",
    "nodesep": "0.6",
    "ranksep": "1.0",
    "bgcolor": "white",
}

with Diagram(
    "Enterprise AI Pilot Rescue Kit  —  Architecture",
    filename="docs/architecture",
    show=False,
    direction="LR",
    outformat="png",
    graph_attr=graph_attr,
):
    user = Users("User\n(browser)")

    # ---- Application tier (single Node process: node index.js) ----
    with Cluster("Node.js Application  (node index.js)"):
        ui = JavaScript("Frontend\npublic/index.html\n(single HTML, no build)")
        server = Nodejs(
            "Express server  index.js\nPOST /api/diagnose\nGET /api/history · /api/health"
        )
        diagnosis = JavaScript("Diagnosis orchestrator\nservices/diagnosis.js")
        retriever = JavaScript("Retriever + Embeddings\nservices/retriever.js\nutils/embeddings.js")
        swap = JavaScript("store.js\n— SWAP POINT —\nUSE_REAL_ATLAS flag")

        ui >> Edge(label="fetch JSON") >> server
        server >> diagnosis
        diagnosis >> Edge(label="embed → top-k") >> retriever
        retriever >> swap

    # ---- Reasoning engine: REAL in BOTH modes ----
    with Cluster("AWS  •  region ap-south-1"):
        nova = Bedrock(
            "Amazon Bedrock\nNova Pro\napac.amazon.nova-pro-v1:0"
        )

    diagnosis >> Edge(
        label="Converse API  (real in BOTH modes)",
        color="darkorange",
        fontcolor="darkorange",
        penwidth="2.2",
    ) >> nova

    # ---- Data layer: choose ONE via USE_REAL_ATLAS ----
    with Cluster("Data Layer  —  pick ONE via USE_REAL_ATLAS"):

        with Cluster("MOCK   (USE_REAL_ATLAS=false)"):
            mock = Storage("mockStore.js\nin-memory collections")
            mockfile = Storage("store.local.json\n(file persistence)")
            collections_mock = JavaScript(
                "pilotProfiles · failurePatterns\nrecommendations · rescueLogs\n(JS cosine vector search)"
            )
            mock >> Edge(style="dotted", label="persist") >> mockfile
            mock >> collections_mock

        with Cluster("REAL   (USE_REAL_ATLAS=true)"):
            atlas = Mongodb("MongoDB Atlas\npilotrescue DB")
            vsearch = Mongodb("Atlas Vector Search\n$vectorSearch index\nfailurePatterns_vec")
            collections_atlas = JavaScript(
                "pilotProfiles · failurePatterns\nrecommendations · rescueLogs"
            )
            atlas >> Edge(label="vector query") >> vsearch
            atlas >> collections_atlas

    swap >> Edge(
        label="USE_REAL_ATLAS=false",
        color="gray40",
        style="dashed",
        fontcolor="gray40",
    ) >> mock
    swap >> Edge(
        label="USE_REAL_ATLAS=true",
        color="darkgreen",
        fontcolor="darkgreen",
        penwidth="2.2",
    ) >> atlas

    # entry edge
    user >> Edge(label="HTTP :3000") >> ui
