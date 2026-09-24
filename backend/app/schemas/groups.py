from pydantic import BaseModel, ConfigDict


class GroupCreate(BaseModel):
    name: str


class GroupRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str


class MemberCreate(BaseModel):
    name: str


class MemberRead(BaseModel):
    id: int
    group_id: int
    name: str
