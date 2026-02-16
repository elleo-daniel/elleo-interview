import { Stage } from './types';

export const INTERVIEW_STAGES_EN: Stage[] = [
    /* =========================
     * Stage 1. Motivation & Potential
     * ========================= */
    {
        id: 'stage1',
        title: '1단계: 지원 동기 및 목표',
        description: '지원자의 목표와 회사 방향성의 적합성을 확인합니다.',
        sections: [
            {
                id: 's1_motivation',
                questions: [
                    {
                        id: 'q1_1',
                        text: 'Could you briefly introduce yourself and tell us how you came to apply for Sushia?',
                        checkpoints: ['Sincerity of Motivation']
                    },
                    {
                        id: 'q1_2',
                        text: 'What brought you to Australia, and what are your plans for staying here?',
                        checkpoints: ['Sustainability of Employment']
                    },
                    {
                        id: 'q1_3',
                        text: 'Is there any personal experience or goal you would like to achieve while working here?',
                        checkpoints: ['Willingness to Grow']
                    },
                    {
                        id: 'q1_4',
                        text: 'Where do you see yourself in about 1 or 3 years?',
                        checkpoints: ['Career Vision & Attitude']
                    }
                ]
            }
        ]
    },

    /* =========================
     * Stage 2. Job Competence & Career Verification
     * ========================= */
    {
        id: 'stage2',
        title: '2단계: 경력 및 직무 역량',
        description: '이전 경험을 바탕으로 실제 업무 수행 가능성을 확인합니다.',
        sections: [
            {
                id: 's2_common',
                questions: [
                    {
                        id: 'q2_1',
                        text: 'Where have you worked the longest, and what were your main responsibilities there?',
                        checkpoints: ['Responsibility']
                    },
                    {
                        id: 'q2_2',
                        text: 'What was the biggest reason for leaving that job?',
                        checkpoints: ['Stability of Reason for Leaving']
                    }
                ]
            },
            {
                id: 's2_experienced',
                condition: 'hasSushiExperience === true',
                questions: [
                    {
                        id: 'q2_3',
                        text: 'Among Roll, Nigiri, Sashimi, and Hot Food, which part are you most confident in? How long have you experienced each part?',
                        checkpoints: ['Practical Proficiency']
                    },
                    {
                        id: 'q2_4',
                        text: 'Do you have experience processing salmon from Oroshi to Sashimi? (Fillet, Slice, Portion differentiation)',
                        checkpoints: ['Technical Proficiency']
                    },
                    {
                        id: 'q2_5',
                        text: 'Do you have your own know-how for managing priorities when orders pile up?',
                        checkpoints: ['Multitasking Ability']
                    }
                ]
            },
            {
                id: 's2_junior',
                condition: 'hasSushiExperience === false',
                questions: [
                    {
                        id: 'q2_6',
                        text: 'When learning something new or unfamiliar, how would you describe your learning speed?',
                        checkpoints: ['Learning Adaptability']
                    },
                    {
                        id: 'q2_7',
                        text: 'This job involves repetitive tasks and standing for long periods. Is this okay physically?',
                        checkpoints: ['Physical Suitability']
                    }
                ]
            }
        ]
    },

    /* =========================
     * Stage 3. Personality & Teamwork
     * ========================= */
    {
        id: 'stage3',
        title: '3단계: 성격 및 팀워크',
        description: '팀 환경에서의 소통 방식과 스트레스 대응 방식을 확인합니다.',
        sections: [
            {
                id: 's3_personality',
                questions: [
                    {
                        id: 'q3_1',
                        text: 'What keywords best describe your personality? Feedback from others is also fine.',
                        checkpoints: ['Self-Awareness']
                    },
                    {
                        id: 'q3_2',
                        text: 'How do you usually manage your condition when busy or stressed?',
                        checkpoints: ['Stress Management']
                    },
                    {
                        id: 'q3_3',
                        text: 'How do you usually resolve disagreements with team members or supervisors?',
                        checkpoints: ['Communication Style']
                    },
                    {
                        id: 'q3_4',
                        text: 'Do you prefer an environment with well-organized rules or a relatively free atmosphere?',
                        checkpoints: ['Organizational Culture Fit']
                    }
                ]
            }
        ]
    },

    /* =========================
     * Stage 4. Conditions & Schedule
     * ========================= */
    {
        id: 'stage4',
        title: '4단계: 근무 조건 및 일정',
        description: '근무 가능 일정과 조건을 확인하여 실제 근무 가능 여부를 조율합니다.',
        sections: [
            {
                id: 's4_logistics',
                questions: [
                    {
                        id: 'q4_1',
                        text: 'How would you rate your basic English communication skills required for work?',
                        checkpoints: ['Communication Level']
                    },
                    {
                        id: 'q4_2',
                        text: 'When can you start working?',
                        checkpoints: ['Start Date']
                    },
                    {
                        id: 'q4_3',
                        text: 'Are there any days or times when you regularly cannot work?',
                        checkpoints: ['Schedule Constraints']
                    },
                    {
                        id: 'q4_4',
                        text: 'How many hours per week do you hope to work?',
                        checkpoints: ['Available Hours']
                    },
                    {
                        id: 'q4_5',
                        text: 'Do you have a specific hourly rate or annual salary in mind?',
                        checkpoints: ['Salary Negotiation']
                    },
                    {
                        id: 'q4_6',
                        text: 'How do you plan to commute, and how long does it take?',
                        checkpoints: ['Commute Stability']
                    },
                    {
                        id: 'q4_7',
                        text: 'Is there anything else you would like to share regarding the company or work?',
                        checkpoints: ['Additional Risks']
                    }
                ]
            }
        ]
    },

    /* =========================
        title: 'Stage 5: Notice & Evaluation',
     * ========================= */
    {
        id: 'stage5',
        title: '5단계: 필수 고지사항',
        description: '회사의 주요 운영 방침과 혜택, 필수 안내 사항에 대한 최종 확인 단계입니다.',
        type: 'notice',
        sections: [
            {
                id: 's5_notice',
                questions: [],
                notices: [
                    'Elleo Group complies with legal regulations, and all wages are automatically deposited every two weeks. (No cash payments)',
                    'Annual Leave and Superannuation are legally applied, making the actual value higher than the base pay.',
                    'Legal minimum wage (Rate) may vary based on age.',
                    'Store operating hours are 07:00 ~ 17:30, and work schedules are adjusted accordingly.',
                    'For Working Holiday visa holders, maximum weekly work hours cannot exceed 42 hours per internal policy.',
                    'Employment starts as part-time, with opportunities for full-time transition and visa sponsorship based on performance.',
                    'The first hour of work is a trial to check job suitability and is unpaid.',
                    'A minimum notice of 2 weeks is required before resignation for handover.',
                    'A 6-month probation period applies, during which both the company and the employee can terminate the contract.'
                ],
                requireConsent: true
            },
            {
                id: 's5_evaluation',
                title: 'Candidate Evaluation',
                questions: [
                    {
                        id: 'q5_eval',
                        text: "What was the overall attitude and impression of the candidate? (Interviewer's Evaluation)",
                        checkpoints: ['Overall Impression', 'Attitude and Sincerity']
                    }
                ]
            }
        ]
    }
];
