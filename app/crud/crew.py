from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.crew import Crew
from app.models.agent import Agent
from app.schemas.crew import CrewCreate, CrewUpdate
import uuid

def get_crew(db: Session, crew_id: str) -> Optional[Crew]:
    return db.query(Crew).filter(Crew.id == crew_id).first()

def get_crews(db: Session, skip: int = 0, limit: int = 100) -> List[Crew]:
    return db.query(Crew).offset(skip).limit(limit).all()

def create_crew(db: Session, crew: CrewCreate) -> Crew:
    db_crew = Crew(id=str(uuid.uuid4()), **crew.model_dump())
    db.add(db_crew)
    db.commit()
    db.refresh(db_crew)
    return db_crew

def update_crew(db: Session, crew_id: str, crew: CrewUpdate) -> Optional[Crew]:
    db_crew = get_crew(db, crew_id)
    if not db_crew:
        return None
    
    update_data = crew.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_crew, field, value)
    
    db.commit()
    db.refresh(db_crew)
    return db_crew

def delete_crew(db: Session, crew_id: str) -> bool:
    db_crew = get_crew(db, crew_id)
    if not db_crew:
        return False
    
    db.delete(db_crew)
    db.commit()
    return True

def add_agent_to_crew(db: Session, crew_id: str, agent_id: str) -> Optional[Crew]:
    db_crew = get_crew(db, crew_id)
    db_agent = db.query(Agent).filter(Agent.id == agent_id).first()
    
    if not db_crew or not db_agent:
        return None
    
    db_crew.agents.append(db_agent)
    db.commit()
    db.refresh(db_crew)
    return db_crew

def remove_agent_from_crew(db: Session, crew_id: str, agent_id: str) -> Optional[Crew]:
    db_crew = get_crew(db, crew_id)
    db_agent = db.query(Agent).filter(Agent.id == agent_id).first()
    
    if not db_crew or not db_agent:
        return None
    
    db_crew.agents.remove(db_agent)
    db.commit()
    db.refresh(db_crew)
    return db_crew 