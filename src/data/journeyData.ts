
import { Phase } from "@/types/journey";

export const journeyPhases: Phase[] = [
  {
    id: "fase-0",
    title: "Preparação da Implantação",
    description: "Entenda como a jornada funciona, alinhe responsabilidades e prepare-se para o sucesso.",
    order: 0,
    hasMeeting: false,
    modules: [
      {
        id: "mod-0-1",
        title: "Como funciona a Jornada Guiada",
        area: "Institucional",
        type: "Material",
        objective: "Explicar a lógica da implantação guiada.",
        audience: "Todos",
        estimatedTime: "5 min",
        isRequired: true,
        requiresEvidence: false,
        content: "A Jornada Guiada de Implantação foi criada para ajudar sua empresa a avançar com mais autonomia e segurança. Cada fase reúne materiais, tarefas práticas e validações.",
        steps: [
          "Entender que o avanço é gradual",
          "Saber que os encontros são liberados condicionalmente",
          "Identificar os marcos da jornada"
        ],
        practicalTask: "Ler as orientações e confirmar que entendeu como a jornada funciona.",
        validationQuestion: "Quando o encontro com o implantador será liberado?",
        expectedAnswer: "Depois da conclusão dos materiais, envio das evidências e aprovação do checkpoint da fase.",
      },
      {
        id: "mod-0-2",
        title: "Responsáveis Internos",
        area: "Gestão",
        type: "Task",
        objective: "Definir quem participará da implantação.",
        audience: "Gestor",
        estimatedTime: "10 min",
        isRequired: true,
        requiresEvidence: false,
        content: "Para que a implantação avance com qualidade, sua empresa deve definir responsáveis internos por cada frente: Cadastros, Operacional e Financeiro.",
        steps: [
          "Listar usuários principais",
          "Atribuir papéis na jornada",
          "Confirmar disponibilidade para treinamentos"
        ],
        practicalTask: "Preencher os responsáveis internos no seu controle interno.",
        validationQuestion: "Qual a importância de definir responsáveis?",
        expectedAnswer: "Evitar retrabalho, centralizar decisões e garantir fluidez.",
      }
    ],
    quiz: [
      { id: "q0-1", question: "Qual é o objetivo da Jornada Guiada de Implantação?", correctAnswer: "Avançar com autonomia e segurança seguindo passos validados." },
      { id: "q0-2", question: "O encontro com o implantador fica disponível desde o início?", correctAnswer: "Não, apenas após cumprir os pré-requisitos da fase." }
    ]
  },
  {
    id: "fase-1",
    title: "Cadastros e Base do Sistema",
    description: "Configuração inicial da empresa, usuários, filiais, bancos e parametrização comercial.",
    order: 1,
    hasMeeting: true,
    meetingId: "meeting-1",
    meetingTitle: "Encontro 1: Parametrização de Cadastros, Produtos e Comissão",
    modules: [
      {
        id: "mod-1-1",
        title: "Usuários e Privilégios",
        area: "Configuração",
        type: "Evidence",
        objective: "Configurar acessos com segurança.",
        audience: "Administrador",
        estimatedTime: "8 min",
        isRequired: true,
        requiresEvidence: true,
        evidenceDescription: "Anexar print da tela de privilégios configurados.",
        content: "Usuários e Privilégios definem quem pode acessar cada área do sistema. Evite liberar acesso Master sem necessidade.",
        steps: [
          "Acessar Cadastros > Usuários",
          "Criar perfis de acesso",
          "Vincular usuários aos perfis"
        ],
        practicalTask: "Cadastrar ou revisar os usuários principais da operação.",
        validationQuestion: "Por que não é recomendado liberar acesso Master para todos?",
        expectedAnswer: "Risco de alterações indevidas e falta de controle sobre dados sensíveis.",
      },
      {
        id: "mod-1-14",
        title: "Produtos",
        area: "Comercial",
        type: "Pre-Meeting",
        objective: "Preparar a estrutura de produtos operados.",
        audience: "Comercial",
        estimatedTime: "15 min",
        isRequired: true,
        requiresEvidence: true,
        evidenceDescription: "Anexar lista dos produtos ou print do controle atual.",
        content: "Produtos são a base que relaciona bancos, convênios e comissões. Exige validação final com o implantador.",
        steps: [
          "Identificar bancos e convênios parceiros",
          "Listar produtos e taxas",
          "Organizar prazos e regras de aceitação"
        ],
        practicalTask: "Listar os principais produtos trabalhados pela empresa.",
        validationQuestion: "O que acontece se um produto for mal configurado?",
        expectedAnswer: "Gera problemas na conferência de produção e no fechamento de comissão.",
      }
    ],
    quiz: [
      { id: "q1-1", question: "Qual o risco de liberar usuário Master para muitos?", correctAnswer: "Aumenta risco de segurança e alterações críticas sem rastreio." },
      { id: "q1-2", question: "Produtos devem estar cadastrados antes do financeiro?", correctAnswer: "Sim, pois impactam diretamente nos cálculos de comissão." }
    ]
  },
  {
    id: "fase-2",
    title: "Operacional",
    description: "Rotinas de entrada, esteira de análise e importação de produção.",
    order: 2,
    hasMeeting: true,
    meetingId: "meeting-2",
    meetingTitle: "Encontro 2: Operação, Esteira e Importação",
    modules: [
      {
        id: "mod-2-10",
        title: "Esteira de Análise",
        area: "Operacional",
        type: "Pre-Meeting",
        objective: "Dominar a principal tela de acompanhamento.",
        audience: "Operacional",
        estimatedTime: "20 min",
        isRequired: true,
        requiresEvidence: true,
        evidenceDescription: "Anexar fluxograma ou descrição do modelo atual de controle.",
        content: "A Esteira de Análise centraliza status, pendências e filtros da produção.",
        steps: [
          "Entender os status da esteira",
          "Aprender a filtrar por período e vendedor",
          "Identificar onde tratar pendências"
        ],
        practicalTask: "Descrever o fluxo operacional atual da sua empresa.",
        validationQuestion: "Para que serve a Esteira de Análise?",
        expectedAnswer: "Acompanhar o ciclo de vida dos contratos e identificar gargalos.",
      }
    ],
    quiz: [
      { id: "q2-1", question: "O que deve ser validado antes de importar produção?", correctAnswer: "Layout do arquivo e consistência dos campos obrigatórios." }
    ]
  },
  {
    id: "fase-3",
    title: "Financeiro",
    description: "Gestão de débitos, créditos, comissão e fechamento de vendedores.",
    order: 3,
    hasMeeting: true,
    meetingId: "meeting-3",
    meetingTitle: "Encontro 3: Financeiro e Fechamento",
    modules: [
      {
        id: "mod-3-7",
        title: "Fechamento de Vendedores",
        area: "Financeiro",
        type: "Pre-Meeting",
        objective: "Garantir apuração correta das comissões.",
        audience: "Financeiro",
        estimatedTime: "25 min",
        isRequired: true,
        requiresEvidence: true,
        evidenceDescription: "Anexar exemplo de fechamento atual ou planilha usada hoje.",
        content: "Etapa onde se apura, confere e valida valores a pagar.",
        steps: [
          "Importar comissões recebidas",
          "Lançar débitos e créditos",
          "Processar fechamento e conferir totais"
        ],
        practicalTask: "Preparar um exemplo de fechamento para validar com o implantador.",
        validationQuestion: "O que precisa estar pronto antes de fechar comissão?",
        expectedAnswer: "Regras de produtos, vendedores cadastrados e produção importada.",
      }
    ],
    quiz: [
      { id: "q3-1", question: "Qual o risco de importar comissão com layout errado?", correctAnswer: "Gerar divergências de valores e retrabalho no fechamento." }
    ]
  },
  {
    id: "fase-4",
    title: "Relatórios",
    description: "Visão estratégica e análise de dados para tomada de decisão.",
    order: 4,
    hasMeeting: false,
    modules: [
      {
        id: "mod-4-1",
        title: "Explorando os Relatórios",
        area: "Gestão",
        type: "Material",
        objective: "Conhecer as ferramentas de análise.",
        audience: "Gestores",
        estimatedTime: "15 min",
        isRequired: true,
        requiresEvidence: true,
        evidenceDescription: "Anexar print de pelo menos 3 relatórios acessados.",
        content: "Conheça o Relatório Geral, Extrato Financeiro e Desempenho por Vendedor.",
        steps: [
          "Acessar módulo de relatórios",
          "Testar filtros de data e filial",
          "Exportar dados para conferência"
        ],
        practicalTask: "Acessar 3 relatórios diferentes e validar os dados exibidos.",
        validationQuestion: "Qual relatório mostra o desempenho mensal por vendedor?",
        expectedAnswer: "Relatório de Vendedor Mês a Mês.",
      }
    ],
    quiz: [
      { id: "q4-1", question: "Qual relatório oferece visão consolidada da operação?", correctAnswer: "Relatório Geral." }
    ]
  },
  {
    id: "fase-5",
    title: "Validação Final",
    description: "Revisão geral de todos os marcos e liberação para operação assistida.",
    order: 5,
    hasMeeting: false,
    modules: [
      {
        id: "mod-5-1",
        title: "Checklist de Encerramento",
        area: "Gestão",
        type: "Task",
        objective: "Confirmar prontidão da empresa.",
        audience: "Gestor",
        estimatedTime: "20 min",
        isRequired: true,
        requiresEvidence: false,
        content: "Revisão final de parâmetros, usuários e fluxos operacionais.",
        steps: [
          "Validar todos os encontros como concluídos",
          "Confirmar que a equipe operacional está treinada",
          "Revisar pendências críticas"
        ],
        practicalTask: "Marcar todos os itens do checklist final como concluídos.",
        validationQuestion: "A empresa sente segurança para iniciar operação real?",
        expectedAnswer: "Sim, após cumprir todos os passos da jornada.",
      }
    ],
    quiz: []
  },
  {
    id: "fase-6",
    title: "Operação Assistida",
    description: "Acompanhamento em tempo real dos primeiros dias de uso.",
    order: 6,
    hasMeeting: false,
    modules: [
      {
        id: "mod-6-1",
        title: "Primeira Semana",
        area: "Operacional",
        type: "Material",
        objective: "Monitorar o uso real do sistema.",
        audience: "Todos",
        estimatedTime: "7 dias",
        isRequired: true,
        requiresEvidence: false,
        content: "Acompanhamento de 7 a 15 dias para tirar dúvidas práticas no dia a dia.",
        steps: [
          "Realizar entrada de contratos reais",
          "Testar primeiro fechamento real",
          "Registrar dúvidas recorrentes"
        ],
        practicalTask: "Anotar dúvidas para o feedback final.",
        validationQuestion: "Qual a duração sugerida da operação assistida?",
        expectedAnswer: "Entre 7 e 15 dias.",
      }
    ],
    quiz: []
  }
];
