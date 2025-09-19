from sqlmodel import Session, create_engine
from app.models import User, Quiz, Question, Answer
from app.auth import hash_password
from datetime import datetime
from uuid import uuid4
import os
from dotenv import load_dotenv

load_dotenv()

# Database connection
engine = create_engine(os.environ.get("DATABASE_URL"))

def create_sample_data():
    """Create comprehensive test data"""
    
    with Session(engine) as session:
        print("🌱 Seeding database with test data...")
        
        # 1. Create Users
        users_data = [
            {"username": "alice_creator", "email": "alice@test.com", "role": "creator"},
            {"username": "bob_player", "email": "bob@test.com", "role": "player"},
            {"username": "charlie_admin", "email": "charlie@test.com", "role": "admin"},
            {"username": "diana_player", "email": "diana@test.com", "role": "player"},
        ]
        
        users = []
        for user_data in users_data:
            user = User(
                username=user_data["username"],
                email=user_data["email"],
                password_hash=hash_password("testpass123"),
                role=user_data["role"],
                global_score=0,
                created_at=datetime.utcnow()
            )
            session.add(user)
            users.append(user)
        
        session.commit()
        print(f"✅ Created {len(users)} users")
        
        # 2. Create Quizzes
        quizzes_data = [
            {
                "title": "World Geography",
                "category": "Geography", 
                "description": "Test your knowledge of world geography",
                "visibility": 'public',
                "creator": users[0]  # alice_creator
            },
            {
                "title": "Programming Basics",
                "category": "Technology",
                "description": "Basic programming concepts",
                "visibility": 'public',
                "creator": users[0]  # alice_creator
            },
            {
                "title": "Private Science Quiz",
                "category": "Science",
                "description": "Advanced science questions",
                "visibility": 'public',
                "sharing_link": str(uuid4()),
                "creator": users[0]  # alice_creator
            }
        ]
        
        quizzes = []
        for quiz_data in quizzes_data:
            quiz = Quiz(
                uuid=uuid4(),
                title=quiz_data["title"],
                category=quiz_data["category"],
                description=quiz_data.get("description"),
                sharing_link=quiz_data.get("sharing_link"),
                time_limit=300,  # 5 minutes
                creator_id=quiz_data["creator"].id,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            session.add(quiz)
            quizzes.append(quiz)
        
        session.commit()
        print(f"✅ Created {len(quizzes)} quizzes")
        
        # 3. Create Questions and Answers
        questions_answers_data = [
            # Geography Quiz Questions
            {
                "quiz": quizzes[0],
                "questions": [
                    {
                        "text": "What is the capital of Australia?",
                        "type": "single_choice",
                        "answers": [
                            {"text": "Sydney", "is_correct": False},
                            {"text": "Melbourne", "is_correct": False},
                            {"text": "Canberra", "is_correct": True},
                            {"text": "Perth", "is_correct": False}
                        ]
                    },
                    {
                        "text": "Which river is the longest in the world?",
                        "type": "single_choice",
                        "answers": [
                            {"text": "Amazon", "is_correct": True},
                            {"text": "Nile", "is_correct": False},
                            {"text": "Mississippi", "is_correct": False},
                            {"text": "Yangtze", "is_correct": False}
                        ]
                    },
                    {
                        "text": "Mount Everest is located in the Himalayas.",
                        "type": "true_false",
                        "answers": [
                            {"text": "True", "is_correct": True},
                            {"text": "False", "is_correct": False}
                        ]
                    }
                ]
            },
            # Programming Quiz Questions
            {
                "quiz": quizzes[1],
                "questions": [
                    {
                        "text": "What does 'HTML' stand for?",
                        "type": "single_choice",
                        "answers": [
                            {"text": "Hypertext Markup Language", "is_correct": True},
                            {"text": "High Tech Modern Language", "is_correct": False},
                            {"text": "Home Tool Markup Language", "is_correct": False},
                            {"text": "Hyperlink and Text Markup Language", "is_correct": False}
                        ]
                    },
                    {
                        "text": "What is the result of 10 // 3 in Python?",
                        "type": "fill_blank",
                        "answers": [
                            {"text": "3", "is_correct": True}
                        ]
                    },
                    {
                        "text": "Python is case-sensitive.",
                        "type": "true_false",
                        "answers": [
                            {"text": "True", "is_correct": True},
                            {"text": "False", "is_correct": False}
                        ]
                    },
                    {
                        "text": "Which of the following are Python data types?",
                        "type": "multiple_choice",
                        "answers": [
                            {"text": "int", "is_correct": True},
                            {"text": "str", "is_correct": True},
                            {"text": "bool", "is_correct": True},
                            {"text": "number", "is_correct": False}
                        ]
                    }
                ]
            },
            # Science Quiz Questions
            {
                "quiz": quizzes[2],
                "questions": [
                    {
                        "text": "What is the chemical symbol for gold?",
                        "type": "fill_blank",
                        "answers": [
                            {"text": "Au", "is_correct": True},
                            {"text": "au", "is_correct": True}  # Case variations
                        ]
                    },
                    {
                        "text": "The speed of light is approximately 300,000 km/s.",
                        "type": "true_false",
                        "answers": [
                            {"text": "True", "is_correct": True},
                            {"text": "False", "is_correct": False}
                        ]
                    }
                ]
            }
        ]
        
        total_questions = 0
        total_answers = 0
        
        for quiz_data in questions_answers_data:
            for q_data in quiz_data["questions"]:
                # Create question
                question = Question(
                    quiz_id=quiz_data["quiz"].id,
                    text=q_data["text"],
                    question_type=q_data["type"],
                    created_at=datetime.utcnow()
                )
                session.add(question)
                session.commit()  # Commit to get question ID
                session.refresh(question)
                total_questions += 1
                
                # Create answers
                for answer_data in q_data["answers"]:
                    answer = Answer(
                        question_id=question.id,
                        text=answer_data["text"],
                        is_correct=answer_data["is_correct"]
                    )
                    session.add(answer)
                    total_answers += 1
        
        session.commit()
        print(f"✅ Created {total_questions} questions with {total_answers} answers")
        
        # 4. Print Test Information
        print("\n🎮 Test Data Summary:")
        print("=" * 50)
        
        for i, quiz in enumerate(quizzes):
            print(f"\nQuiz {i+1}: '{quiz.title}'")
            print(f"  - ID: {quiz.id}")
            print(f"  - UUID: {quiz.uuid}")
            print(f"  - Category: {quiz.category}")
            print(f"  - Visibility: {quiz.visibility}")
            if quiz.sharing_link:
                print(f"  - Sharing Link: {quiz.sharing_link}")
            
            # Count questions
            question_count = len(session.exec(
                session.query(Question).filter(Question.quiz_id == quiz.id)
            ).all())
            print(f"  - Questions: {question_count}")
        
        print("\n👥 Test Users:")
        for user in users:
            print(f"  - {user.username} ({user.role}) - {user.email}")
        
        print(f"\n🔑 Password for all users: testpass123")
        
        print("\n🚀 Ready to test! Try these endpoints:")
        print(f"  1. Login: POST /auth/login")
        print(f"  2. Start quiz: POST /quizzes/{quizzes[0].id}/start")
        print(f"  3. Get leaderboard: GET /quizzes/{quizzes[0].id}/leaderboard")

if __name__ == "__main__":
    create_sample_data()
    print("\n✨ Database seeding complete!")