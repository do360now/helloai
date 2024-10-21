from data.user import User
from starlette.requests import Request
from viewmodels.shared.viewmodel import ViewModelBase


class AccountViewModel(ViewModelBase):
    def __init__(self, request: Request):
        super().__init__(request)
        self.user = User('Clement', 'cm@helloai.com', 'some8se74s')
