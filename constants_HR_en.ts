import { Stage } from './types';

export const INTERVIEW_STAGES_EN: Stage[] = [
    {
        id: 'stage1',
        title: '1단계: 인성 및 가치관',
        sections: [
            {
                id: 's1_a',
                title: 'A. 개인 캐릭터 / 성격 구조 질문',
                questions: [
                    { id: 'q1_1', text: 'What are 3 keywords that you think describe your personality?', checkpoints: ['Self-Awareness'] },
                    { id: 'q1_2', text: 'If a close friend defined you in one sentence, what would it be?', checkpoints: ['Self-Awareness'] },
                    { id: 'q1_3', text: 'What is your reaction pattern when stressed?', checkpoints: ['Emotional Control'] },
                    { id: 'q1_4', text: 'How do you usually process your anger when you contain it?', checkpoints: ['Emotional Control'] },
                    { id: 'q1_5', text: 'When was the warmest or coldest moment in your life?', checkpoints: ['Self-Reflection', 'Defensiveness'] },
                    { id: 'q1_6', text: 'Are there any signals your body or mind sends when you feel completely burned out?', checkpoints: ['Self-Awareness', 'Emotional Control'] },
                    { id: 'q1_7', text: "Have you ever had an unexpected 'break' in your life? How did you get back to normal?", checkpoints: ['Self-Reflection', 'Problem Solving'] },
                ]
            },
            {
                id: 's1_b',
                title: 'B. 성장배경 / 가정환경',
                questions: [
                    { id: 'q1_8', text: 'Is there anything in your upbringing or background that you feel has influenced you?', checkpoints: ['Responsibility Structure'] },
                    { id: 'q1_9', text: 'Are there any values or habits you naturally learned from your family or upbringing that help you now?', checkpoints: ['Relationship Building'] },
                    { id: 'q1_10', text: 'When you have difficulties or worries, who or what do you usually rely on first?', checkpoints: ['Dependent vs Independent'] },
                ]
            },
            {
                id: 's1_c',
                title: 'C. 삶의 태도 / 내적 기준',
                questions: [
                    { id: 'q1_11', text: 'Do you have a motto or personal standard that guides your life?', checkpoints: ['Growth Mindset'] },
                    { id: 'q1_12', text: 'When was the most difficult moment in your life, and how did you overcome it?', checkpoints: ['Problem Solving', 'Avoidance vs Confrontation'] },
                    { id: 'q1_13', text: 'Could you share an event or experience that you feel made you grow?', checkpoints: ['Victim Mentality'] },
                ]
            }
        ]
    },
    {
        id: 'stage2',
        title: '2단계: 조직 적응력 및 문화',
        sections: [
            {
                id: 's2_a',
                title: 'A. 팀워크 구조',
                questions: [
                    { id: 'q2_1', text: 'What role or position do you usually take when working in a team?', checkpoints: ['Leader/Supporter/Mediator/Executor'] },
                    { id: 'q2_2', text: 'How do you usually respond to disagreements or conflicts in a team?', checkpoints: ['Communication Style', 'Authority Perception'] },
                    { id: 'q2_3', text: 'How do you express your opinion during a conflict?', checkpoints: ['Communication Style'] },
                    { id: 'q2_4', text: 'Do you have your own way of expressing disagreement with a supervisor?', checkpoints: ['Vertical Relationship Perception'] },
                    { id: 'q2_5', text: 'How do you feel when starting work without being perfectly prepared?', checkpoints: ['Acceptance'] },
                    { id: 'q2_6', text: 'Alone vs Team, which environment do you prefer?', checkpoints: ['Organizational Adaptability'] },
                    { id: 'q2_7', text: 'If you were a leader, what type of team member would you find most difficult to handle?', checkpoints: ['Organizational Adaptability'] },
                ]
            },
            {
                id: 's2_b',
                title: 'B. 조직 문화 적응력 질문',
                questions: [
                    { id: 'q2_8', text: 'Could you share the most difficult organizational culture you adapted to and the one that fit you best?', checkpoints: ['Rule Acceptance', 'System Adaptability', 'Culture Fit'] },
                    { id: 'q2_9', text: 'Which fits you better: an organization with many rules or a free one?', checkpoints: ['Mindset Type'] },
                ]
            }
        ]
    },
    {
        id: 'stage3',
        title: '3단계: 직무 역량 (Skill)',
        sections: [
            {
                id: 's3_a',
                title: '기술 레벨',
                questions: [
                    { id: 'q3_1', text: 'How many rolls can you cover during peak time?', checkpoints: ['Speed'] },
                    { id: 'q3_2', text: 'Do you have your own way to reduce mistakes during a rush?', checkpoints: ['Speed & Accuracy'] },
                    { id: 'q3_3', text: 'What is the most important point when doing Sashimi?', checkpoints: ['Detail Awareness'] },
                    { id: 'q3_4', text: 'What do you think is the most important hygiene standard?', checkpoints: ['Detail Awareness'] },
                    { id: 'q3_5', text: 'Do you have experience preparing Salmon Sashimi yourself?', checkpoints: ['Skill/Experience Depth'] },
                    { id: 'q3_6', text: 'Can you distinguish between Fillet / Slice / Portion work experience?', checkpoints: ['Skill/Experience Depth'] },
                    { id: 'q3_7', text: 'What is your criterion for setting priorities when orders pile up?', checkpoints: ['Multitasking'] },
                    { id: 'q3_8', text: 'How many stations can you cover simultaneously?', checkpoints: ['Multitasking'] },
                ]
            }
        ]
    },
    {
        id: 'stage4',
        title: '4단계: 경력 및 비전',
        sections: [
            {
                id: 's4_a',
                title: 'A. 경력 사항 및 이력',
                questions: [
                    { id: 'q4_1', text: 'What was your longest-serving company or role? What were your main responsibilities?', checkpoints: ['Turnover Pattern'] },
                    { id: 'q4_2', text: 'Could you briefly tell us why you left that job? Did you realize anything?', checkpoints: ['Recurring Reason'] },
                    { id: 'q4_3', text: 'How was your relationship with your boss or colleagues?', checkpoints: ['Relationship Maintenance'] },
                ]
            },
            {
                id: 's4_b',
                title: 'B. 미래 비전 및 목표',
                questions: [
                    { id: 'q4_4', text: 'Imagine yourself working one year from now?', checkpoints: ['Growth Willingness', 'Career Goal'] },
                    { id: 'q4_5', text: 'What about your life in 3 years?', checkpoints: ['Motivation Type', 'Retention Possibility'] },
                    { id: 'q4_6', text: 'What do you want to gain from this job?', checkpoints: ['Growth Willingness', 'Career Goal'] },
                    { id: 'q4_7', text: 'What does this job mean for your career?', checkpoints: ['Long-term Fit', 'Career Goal'] },
                ]
            }
        ]
    },
    {
        id: 'stage5',
        title: '5단계: 필수 고지사항',
        type: 'notice',
        sections: [
            {
                id: 's5_notice',
                questions: [],
                notices: [
                    'Elleo Group complies with legal regulations, and all wages are automatically deposited every two weeks. (No cash payments)',
                    'Annual Leave and Superannuation are legally applied, so the actual value received is higher than the base rate.',
                    'Please note that legal minimum wage rates vary by age.',
                    'Store operating hours are 07:00 ~ 17:30, and schedules will be adjusted accordingly.',
                    'For Working Holiday visa holders, weekly working hours cannot exceed 42 hours due to legal restrictions.',
                    'Employment starts as part-time, with opportunities for full-time conversion and visa sponsorship based on performance.',
                    'The first 4 hours are a trial to check work suitability and are unpaid.',
                    'A minimum of 2 weeks notice is required before resignation for handover.',
                    'A 6-month probation period applies after joining, during which both the company and employee can decide to end the contract.'
                ],
                requireConsent: true
            }
        ]
    }
];
