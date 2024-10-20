class Agent:
    def __init__(
        self,
        agent_name: str,
        summary: str,
        description: str,
        home_page: str,
        lic: str,
        author_name: str,
        maintainers: list = None,
    ):
        if maintainers is None:
            maintainers = []
        self.maintainers = maintainers
        self.author_name = author_name
        self.license = lic
        self.home_page = home_page
        self.description = description
        self.summary = summary
        self.agent_name = agent_name
        self.id = agent_name
