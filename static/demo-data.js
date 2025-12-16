// Demo data for Quiz Master Pro
// This file adds sample quizzes to help users get started

(function() {
    // Check if we already have quizzes
    const existingQuizzes = localStorage.getItem('qmp_quizzes');
    if (existingQuizzes) {
        const quizzes = JSON.parse(existingQuizzes);
        if (quizzes.length > 0) return; // Don't add demo data if user has quizzes
    }
    
    const demoQuizzes = [
        {
            id: 'demo-ccna-1',
            title: 'CCNA Networking Fundamentals',
            description: 'Test your knowledge of basic networking concepts for CCNA certification',
            icon: '🌐',
            color: '#22D3EE',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            tags: ['CCNA', 'Networking', 'OSI'],
            settings: {
                shuffleQuestions: false,
                shuffleOptions: true,
                showExplanations: true,
                timerEnabled: false,
                timerSeconds: 60
            },
            stats: {
                attempts: 0,
                bestScore: 0,
                avgScore: 0,
                lastAttempt: null
            },
            questions: [
                {
                    id: 'q1',
                    number: 1,
                    text: 'Which layer of the OSI model is responsible for logical addressing and routing?',
                    type: 'choice',
                    options: [
                        { letter: 'A', text: 'Data Link Layer', isCorrect: false },
                        { letter: 'B', text: 'Network Layer', isCorrect: true },
                        { letter: 'C', text: 'Transport Layer', isCorrect: false },
                        { letter: 'D', text: 'Session Layer', isCorrect: false }
                    ],
                    correctAnswers: ['B'],
                    explanation: 'The Network Layer (Layer 3) handles logical addressing (IP addresses) and routing packets between networks.'
                },
                {
                    id: 'q2',
                    number: 2,
                    text: 'What is the default subnet mask for a Class B IP address?',
                    type: 'choice',
                    options: [
                        { letter: 'A', text: '255.0.0.0', isCorrect: false },
                        { letter: 'B', text: '255.255.0.0', isCorrect: true },
                        { letter: 'C', text: '255.255.255.0', isCorrect: false },
                        { letter: 'D', text: '255.255.255.255', isCorrect: false }
                    ],
                    correctAnswers: ['B'],
                    explanation: 'Class B addresses (128.0.0.0 - 191.255.255.255) have a default subnet mask of 255.255.0.0 (/16).'
                },
                {
                    id: 'q3',
                    number: 3,
                    text: 'Which protocol operates at the Transport Layer and provides reliable, connection-oriented communication?',
                    type: 'choice',
                    options: [
                        { letter: 'A', text: 'UDP', isCorrect: false },
                        { letter: 'B', text: 'IP', isCorrect: false },
                        { letter: 'C', text: 'TCP', isCorrect: true },
                        { letter: 'D', text: 'ICMP', isCorrect: false }
                    ],
                    correctAnswers: ['C'],
                    explanation: 'TCP (Transmission Control Protocol) operates at Layer 4 and provides reliable, ordered, and error-checked delivery of data.'
                },
                {
                    id: 'q4',
                    number: 4,
                    text: 'Arrange the OSI model layers from top (Layer 7) to bottom (Layer 1):',
                    type: 'order',
                    options: [],
                    correctAnswers: [],
                    orderItems: [
                        { position: 1, text: 'Application' },
                        { position: 2, text: 'Presentation' },
                        { position: 3, text: 'Session' },
                        { position: 4, text: 'Transport' },
                        { position: 5, text: 'Network' },
                        { position: 6, text: 'Data Link' },
                        { position: 7, text: 'Physical' }
                    ],
                    explanation: 'Remember: All People Seem To Need Data Processing (Application, Presentation, Session, Transport, Network, Data Link, Physical)'
                },
                {
                    id: 'q5',
                    number: 5,
                    text: 'Which of the following are valid private IP address ranges? (Select all that apply)',
                    type: 'multiple',
                    options: [
                        { letter: 'A', text: '10.0.0.0 - 10.255.255.255', isCorrect: true },
                        { letter: 'B', text: '172.16.0.0 - 172.31.255.255', isCorrect: true },
                        { letter: 'C', text: '192.168.0.0 - 192.168.255.255', isCorrect: true },
                        { letter: 'D', text: '169.254.0.0 - 169.254.255.255', isCorrect: false }
                    ],
                    correctAnswers: ['A', 'B', 'C'],
                    explanation: 'RFC 1918 defines three private IP ranges: 10.0.0.0/8, 172.16.0.0/12, and 192.168.0.0/16. The 169.254.x.x range is APIPA (link-local).'
                },
                {
                    id: 'q6',
                    number: 6,
                    text: 'A switch operates at which layer of the OSI model?',
                    type: 'choice',
                    options: [
                        { letter: 'A', text: 'Layer 1 - Physical', isCorrect: false },
                        { letter: 'B', text: 'Layer 2 - Data Link', isCorrect: true },
                        { letter: 'C', text: 'Layer 3 - Network', isCorrect: false },
                        { letter: 'D', text: 'Layer 4 - Transport', isCorrect: false }
                    ],
                    correctAnswers: ['B'],
                    explanation: 'Switches operate at Layer 2 and use MAC addresses to forward frames. Layer 3 switches can also perform routing.'
                },
                {
                    id: 'q7',
                    number: 7,
                    text: 'What is the well-known port number for HTTPS?',
                    type: 'choice',
                    options: [
                        { letter: 'A', text: '80', isCorrect: false },
                        { letter: 'B', text: '443', isCorrect: true },
                        { letter: 'C', text: '8080', isCorrect: false },
                        { letter: 'D', text: '22', isCorrect: false }
                    ],
                    correctAnswers: ['B'],
                    explanation: 'HTTPS uses port 443 by default. HTTP uses port 80, SSH uses port 22, and 8080 is commonly used as an alternative HTTP port.'
                },
                {
                    id: 'q8',
                    number: 8,
                    text: 'True or False: A hub sends incoming traffic to all ports except the source port.',
                    type: 'truefalse',
                    options: [
                        { letter: 'T', text: 'True', isCorrect: true },
                        { letter: 'F', text: 'False', isCorrect: false }
                    ],
                    correctAnswers: ['true'],
                    explanation: 'True. Unlike switches, hubs operate at Layer 1 and simply repeat incoming signals to all other ports, creating a single collision domain.'
                }
            ]
        },
        {
            id: 'demo-routing-1',
            title: 'Routing Protocols',
            description: 'Master OSPF, EIGRP, and static routing concepts',
            icon: '📡',
            color: '#10B981',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            tags: ['CCNA', 'Routing', 'OSPF', 'EIGRP'],
            settings: {
                shuffleQuestions: false,
                shuffleOptions: true,
                showExplanations: true,
                timerEnabled: false,
                timerSeconds: 60
            },
            stats: {
                attempts: 0,
                bestScore: 0,
                avgScore: 0,
                lastAttempt: null
            },
            questions: [
                {
                    id: 'r1',
                    number: 1,
                    text: 'What is the administrative distance of OSPF?',
                    type: 'choice',
                    options: [
                        { letter: 'A', text: '90', isCorrect: false },
                        { letter: 'B', text: '100', isCorrect: false },
                        { letter: 'C', text: '110', isCorrect: true },
                        { letter: 'D', text: '120', isCorrect: false }
                    ],
                    correctAnswers: ['C'],
                    explanation: 'OSPF has an AD of 110. EIGRP internal is 90, RIP is 120, and directly connected is 0.'
                },
                {
                    id: 'r2',
                    number: 2,
                    text: 'Which routing protocol uses the DUAL algorithm for loop prevention?',
                    type: 'choice',
                    options: [
                        { letter: 'A', text: 'OSPF', isCorrect: false },
                        { letter: 'B', text: 'EIGRP', isCorrect: true },
                        { letter: 'C', text: 'RIP', isCorrect: false },
                        { letter: 'D', text: 'BGP', isCorrect: false }
                    ],
                    correctAnswers: ['B'],
                    explanation: 'EIGRP uses the Diffusing Update Algorithm (DUAL) to ensure loop-free paths and fast convergence.'
                },
                {
                    id: 'r3',
                    number: 3,
                    text: 'What type of routing protocol is OSPF?',
                    type: 'choice',
                    options: [
                        { letter: 'A', text: 'Distance Vector', isCorrect: false },
                        { letter: 'B', text: 'Link State', isCorrect: true },
                        { letter: 'C', text: 'Path Vector', isCorrect: false },
                        { letter: 'D', text: 'Hybrid', isCorrect: false }
                    ],
                    correctAnswers: ['B'],
                    explanation: 'OSPF is a Link State protocol that builds a complete topology map using LSAs (Link State Advertisements).'
                },
                {
                    id: 'r4',
                    number: 4,
                    text: 'In OSPF, what is the default reference bandwidth used to calculate cost?',
                    type: 'choice',
                    options: [
                        { letter: 'A', text: '10 Mbps', isCorrect: false },
                        { letter: 'B', text: '100 Mbps', isCorrect: true },
                        { letter: 'C', text: '1 Gbps', isCorrect: false },
                        { letter: 'D', text: '10 Gbps', isCorrect: false }
                    ],
                    correctAnswers: ['B'],
                    explanation: 'OSPF cost = Reference Bandwidth / Interface Bandwidth. Default reference is 100 Mbps (10^8 bps).'
                },
                {
                    id: 'r5',
                    number: 5,
                    text: 'Which EIGRP packet type is used to discover neighbors?',
                    type: 'choice',
                    options: [
                        { letter: 'A', text: 'Update', isCorrect: false },
                        { letter: 'B', text: 'Query', isCorrect: false },
                        { letter: 'C', text: 'Hello', isCorrect: true },
                        { letter: 'D', text: 'Reply', isCorrect: false }
                    ],
                    correctAnswers: ['C'],
                    explanation: 'EIGRP uses Hello packets for neighbor discovery and to maintain adjacencies. Hello interval is 5 seconds on most interfaces.'
                }
            ]
        },
        {
            id: 'demo-ios-1',
            title: 'Cisco IOS Commands',
            description: 'Practice essential Cisco IOS configuration commands',
            icon: '💻',
            color: '#A855F7',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            tags: ['CCNA', 'IOS', 'CLI', 'Configuration'],
            settings: {
                shuffleQuestions: false,
                shuffleOptions: true,
                showExplanations: true,
                timerEnabled: false,
                timerSeconds: 90
            },
            stats: {
                attempts: 0,
                bestScore: 0,
                avgScore: 0,
                lastAttempt: null
            },
            questions: [
                {
                    id: 'ios1',
                    number: 1,
                    text: 'What command enters privileged EXEC mode from user EXEC mode?',
                    type: 'choice',
                    options: [
                        { letter: 'A', text: 'configure terminal', isCorrect: false },
                        { letter: 'B', text: 'enable', isCorrect: true },
                        { letter: 'C', text: 'privilege', isCorrect: false },
                        { letter: 'D', text: 'admin', isCorrect: false }
                    ],
                    correctAnswers: ['B'],
                    explanation: 'The "enable" command moves from User EXEC (Router>) to Privileged EXEC mode (Router#).'
                },
                {
                    id: 'ios2',
                    number: 2,
                    text: 'Which command displays the current running configuration?',
                    type: 'choice',
                    options: [
                        { letter: 'A', text: 'show startup-config', isCorrect: false },
                        { letter: 'B', text: 'show running-config', isCorrect: true },
                        { letter: 'C', text: 'show config', isCorrect: false },
                        { letter: 'D', text: 'display configuration', isCorrect: false }
                    ],
                    correctAnswers: ['B'],
                    explanation: '"show running-config" (or "show run") displays the current configuration in RAM. "show startup-config" shows the saved config in NVRAM.'
                },
                {
                    id: 'ios3',
                    number: 3,
                    text: 'Configure GigabitEthernet0/0 with IP 192.168.1.1/24 and enable it.',
                    type: 'ios',
                    options: [],
                    correctAnswers: [],
                    iosConfig: {
                        hostname: 'Router',
                        task: 'Configure interface GigabitEthernet0/0 with IP address 192.168.1.1 and subnet mask 255.255.255.0, then enable the interface.',
                        expected: ['ip address 192.168.1.1', 'no shutdown']
                    },
                    explanation: 'Use "interface GigabitEthernet0/0", then "ip address 192.168.1.1 255.255.255.0", then "no shutdown" to enable.'
                },
                {
                    id: 'ios4',
                    number: 4,
                    text: 'What is the correct order to configure a hostname on a Cisco router?',
                    type: 'order',
                    options: [],
                    correctAnswers: [],
                    orderItems: [
                        { position: 1, text: 'Enter privileged EXEC mode (enable)' },
                        { position: 2, text: 'Enter global configuration mode (configure terminal)' },
                        { position: 3, text: 'Set the hostname (hostname Router1)' },
                        { position: 4, text: 'Exit and save configuration' }
                    ],
                    explanation: 'You must enter enable mode first, then configure terminal to access global config where hostname is set.'
                },
                {
                    id: 'ios5',
                    number: 5,
                    text: 'Which command saves the running configuration to NVRAM?',
                    type: 'choice',
                    options: [
                        { letter: 'A', text: 'write memory', isCorrect: true },
                        { letter: 'B', text: 'save config', isCorrect: false },
                        { letter: 'C', text: 'backup running-config', isCorrect: false },
                        { letter: 'D', text: 'store configuration', isCorrect: false }
                    ],
                    correctAnswers: ['A'],
                    explanation: '"write memory" or "copy running-config startup-config" saves the current config to NVRAM so it persists after reboot.'
                }
            ]
        }
    ];
    
    // Save demo quizzes
    localStorage.setItem('qmp_quizzes', JSON.stringify(demoQuizzes));
    
    // Initialize stats
    localStorage.setItem('qmp_stats', JSON.stringify({
        totalQuizzes: demoQuizzes.length,
        totalQuestions: demoQuizzes.reduce((sum, q) => sum + q.questions.length, 0),
        questionsAnswered: 0,
        correctAnswers: 0,
        streak: 0,
        lastStudyDate: null,
        studyHistory: []
    }));
    
    console.log('Demo quizzes loaded successfully!');
})();
