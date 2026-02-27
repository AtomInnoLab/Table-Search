/**
 * Mock data generator (replaces backend/app/mocks/mock_data.py)
 */

interface MockPaper {
  id: string
  title: string
  authors: string[]
  year: number
  abstract: string
  pdf_url: string
}

interface MockCellValue {
  value: string
  page: number | null
}

// ============ Page 1 papers ============

const PAGE1_PAPERS: MockPaper[] = [
  {
    id: 'paper_001',
    title: 'Attention Is All You Need',
    authors: ['Ashish Vaswani', 'Noam Shazeer', 'Niki Parmar'],
    year: 2017,
    abstract:
      'The dominant sequence transduction models are based on complex recurrent or convolutional neural networks...',
    pdf_url: 'https://arxiv.org/pdf/1706.03762.pdf',
  },
  {
    id: 'paper_002',
    title: 'BERT: Pre-training of Deep Bidirectional Transformers',
    authors: ['Jacob Devlin', 'Ming-Wei Chang', 'Kenton Lee'],
    year: 2019,
    abstract:
      'We introduce a new language representation model called BERT...',
    pdf_url: 'https://arxiv.org/pdf/1810.04805.pdf',
  },
  {
    id: 'paper_003',
    title: 'GPT-3: Language Models are Few-Shot Learners',
    authors: ['Tom B. Brown', 'Benjamin Mann', 'Nick Ryder'],
    year: 2020,
    abstract:
      'Recent work has demonstrated substantial gains on many NLP tasks...',
    pdf_url: 'https://arxiv.org/pdf/2005.14165.pdf',
  },
  {
    id: 'paper_004',
    title: 'LLaMA: Open and Efficient Foundation Language Models',
    authors: ['Hugo Touvron', 'Thibaut Lavril', 'Gautier Izacard'],
    year: 2023,
    abstract:
      'We introduce LLaMA, a collection of foundation language models ranging from 7B to 65B parameters...',
    pdf_url: 'https://arxiv.org/pdf/2302.13971.pdf',
  },
  {
    id: 'paper_005',
    title: 'FlashAttention: Fast and Memory-Efficient Exact Attention',
    authors: ['Tri Dao', 'Daniel Y. Fu', 'Stefano Ermon'],
    year: 2022,
    abstract:
      'Transformers are slow and memory-hungry on long sequences...',
    pdf_url: 'https://arxiv.org/pdf/2205.14135.pdf',
  },
  {
    id: 'paper_006',
    title: 'LoRA: Low-Rank Adaptation of Large Language Models',
    authors: ['Edward J. Hu', 'Yelong Shen', 'Phillip Wallis'],
    year: 2021,
    abstract:
      'An important paradigm of natural language processing consists of large-scale pre-training...',
    pdf_url: 'https://arxiv.org/pdf/2106.09685.pdf',
  },
  {
    id: 'paper_007',
    title: 'Scaling Laws for Neural Language Models',
    authors: ['Jared Kaplan', 'Sam McCandlish', 'Tom Henighan'],
    year: 2020,
    abstract:
      'We study empirical scaling laws for language model performance...',
    pdf_url: 'https://arxiv.org/pdf/2001.08361.pdf',
  },
  {
    id: 'paper_008',
    title: 'Constitutional AI: Harmlessness from AI Feedback',
    authors: ['Yuntao Bai', 'Saurav Kadavath', 'Sandipan Kundu'],
    year: 2022,
    abstract:
      'As AI systems become more capable, we would like to ensure they remain safe...',
    pdf_url: 'https://arxiv.org/pdf/2212.08073.pdf',
  },
  {
    id: 'paper_009',
    title:
      'Chain-of-Thought Prompting Elicits Reasoning in Large Language Models',
    authors: ['Jason Wei', 'Xuezhi Wang', 'Dale Schuurmans'],
    year: 2022,
    abstract:
      'We explore how generating a chain of thought can improve the reasoning abilities...',
    pdf_url: 'https://arxiv.org/pdf/2201.11903.pdf',
  },
  {
    id: 'paper_010',
    title: 'RetNet: Retentive Network - A Successor to Transformer',
    authors: ['Yutao Sun', 'Li Dong', 'Shaohan Huang'],
    year: 2023,
    abstract:
      'We introduce Retentive Network (RetNet) as a foundation architecture for large language models...',
    pdf_url: 'https://arxiv.org/pdf/2307.08621.pdf',
  },
]

// ============ Page 2 papers ============

const PAGE2_PAPERS: MockPaper[] = [
  {
    id: 'paper_011',
    title: 'Mamba: Linear-Time Sequence Modeling with Selective State Spaces',
    authors: ['Albert Gu', 'Tri Dao'],
    year: 2023,
    abstract:
      'Foundation models are almost universally based on the Transformer architecture...',
    pdf_url: 'https://arxiv.org/pdf/2312.00752.pdf',
  },
  {
    id: 'paper_012',
    title: 'Mistral 7B',
    authors: ['Albert Q. Jiang', 'Alexandre Sablayrolles'],
    year: 2023,
    abstract:
      'We introduce Mistral 7B, a 7-billion-parameter language model...',
    pdf_url: 'https://arxiv.org/pdf/2310.06825.pdf',
  },
  {
    id: 'paper_013',
    title: 'QLoRA: Efficient Finetuning of Quantized Language Models',
    authors: ['Tim Dettmers', 'Artidoro Pagnoni', 'Ari Holtzman'],
    year: 2023,
    abstract:
      'We present QLoRA, an efficient finetuning approach that reduces memory usage...',
    pdf_url: 'https://arxiv.org/pdf/2305.14314.pdf',
  },
  {
    id: 'paper_014',
    title: 'DPO: Direct Preference Optimization',
    authors: ['Rafael Rafailov', 'Archit Sharma', 'Eric Mitchell'],
    year: 2023,
    abstract:
      'Large-scale unsupervised language models learn broad world knowledge...',
    pdf_url: 'https://arxiv.org/pdf/2305.18290.pdf',
  },
  {
    id: 'paper_015',
    title: 'Mixture of Experts Meets Instruction Tuning',
    authors: ['Sheng Shen', 'Le Hou', 'Yanqi Zhou'],
    year: 2023,
    abstract:
      'Sparse Mixture-of-Experts (MoE) models are a promising alternative to dense models...',
    pdf_url: 'https://arxiv.org/pdf/2305.14705.pdf',
  },
]

const ALL_PAGES = [PAGE1_PAPERS, PAGE2_PAPERS]

// ============ Fixed auto columns ============

export const FIXED_AUTO_COLUMNS = [
  {
    name: 'Task',
    prompt: 'What is the main task or problem this paper addresses?',
    description: 'Main task of the paper',
  },
  {
    name: 'Method',
    prompt: 'What is the main method or approach proposed in this paper?',
    description: 'Main method proposed',
  },
]

export function getMockPapers(
  _query: string,
  page = 1,
  _pageSize = 20,
): MockPaper[] {
  const idx = page - 1
  if (idx >= 0 && idx < ALL_PAGES.length) {
    return ALL_PAGES[idx]
  }
  return []
}

export function getSuggestedColumns(_query: string) {
  return FIXED_AUTO_COLUMNS.map((col, i) => ({
    id: `col_auto_${i}`,
    name: col.name,
    prompt: col.prompt,
    description: col.description,
  }))
}

// ============ Predefined cell data ============

const MOCK_CELL_DATA: Record<string, MockCellValue> = {
  // Attention Is All You Need
  'paper_001|col_auto_0': { value: 'Multi-Head Self-Attention', page: 3 },
  'paper_001|col_auto_1': { value: 'O(n^2) for self-attention', page: 4 },
  'paper_001|col_auto_2': { value: '8 x NVIDIA P100 GPUs', page: 7 },
  // BERT
  'paper_002|col_auto_0': {
    value: 'Bidirectional Transformer Encoder',
    page: 2,
  },
  'paper_002|col_auto_1': { value: '340M parameters (BERT-Large)', page: 5 },
  'paper_002|col_auto_2': {
    value: 'BooksCorpus + English Wikipedia',
    page: 3,
  },
  // GPT-3
  'paper_003|col_auto_0': {
    value: 'Transformer Decoder (autoregressive)',
    page: 2,
  },
  'paper_003|col_auto_1': { value: '175B parameters', page: 3 },
  'paper_003|col_auto_2': {
    value: 'Common Crawl, WebText2, Books',
    page: 4,
  },
  // LLaMA
  'paper_004|col_auto_0': {
    value: 'Transformer + RMSNorm + SwiGLU',
    page: 2,
  },
  'paper_004|col_auto_1': { value: '7B to 65B parameters', page: 1 },
  'paper_004|col_auto_2': { value: 'Public data (1.4T tokens)', page: 3 },
  // FlashAttention
  'paper_005|col_auto_0': {
    value: 'IO-aware exact attention (tiling)',
    page: 2,
  },
  'paper_005|col_auto_1': { value: 'Sub-quadratic HBM accesses', page: 3 },
  'paper_005|col_auto_2': {
    value: '2-4x speedup on A100 GPU',
    page: 6,
  },
  // LoRA
  'paper_006|col_auto_0': { value: 'Low-Rank Adaptation matrices', page: 2 },
  'paper_006|col_auto_1': {
    value: '10,000x fewer trainable params',
    page: 1,
  },
  'paper_006|col_auto_2': { value: 'NVIDIA V100 GPUs', page: 7 },
  // Scaling Laws
  'paper_007|col_auto_0': { value: 'Power-law scaling analysis', page: 2 },
  'paper_007|col_auto_1': {
    value: 'Up to 1.5B parameters studied',
    page: 3,
  },
  'paper_007|col_auto_2': { value: 'WebText2', page: 4 },
  // Constitutional AI
  'paper_008|col_auto_0': {
    value: 'RLHF with AI-generated feedback',
    page: 2,
  },
  'paper_008|col_auto_1': { value: '52B parameters (base model)', page: 5 },
  'paper_008|col_auto_2': { value: 'Proprietary dataset', page: null },
  // Chain-of-Thought
  'paper_009|col_auto_0': { value: 'Chain-of-Thought prompting', page: 1 },
  'paper_009|col_auto_1': { value: '540B params (PaLM)', page: 3 },
  'paper_009|col_auto_2': {
    value: 'GSM8K, SVAMP, MultiArith',
    page: 4,
  },
  // RetNet
  'paper_010|col_auto_0': {
    value: 'Retention mechanism (parallel+recurrent)',
    page: 2,
  },
  'paper_010|col_auto_1': {
    value: 'O(1) recurrent / O(n) parallel',
    page: 3,
  },
  'paper_010|col_auto_2': { value: 'Comparable to Transformer', page: 5 },
  // Page 2 papers
  'paper_011|col_auto_0': { value: 'Selective State Space (S6)', page: 2 },
  'paper_011|col_auto_1': { value: 'Linear time complexity', page: 3 },
  'paper_011|col_auto_2': {
    value: '5x faster than Transformer on A100',
    page: 7,
  },
  'paper_012|col_auto_0': {
    value: 'Grouped-Query Attention + Sliding Window',
    page: 2,
  },
  'paper_012|col_auto_1': { value: '7B parameters', page: 1 },
  'paper_012|col_auto_2': { value: 'Undisclosed web data', page: 3 },
  'paper_013|col_auto_0': {
    value: '4-bit NormalFloat quantization + LoRA',
    page: 2,
  },
  'paper_013|col_auto_1': {
    value: 'Finetune 65B on single 48GB GPU',
    page: 1,
  },
  'paper_013|col_auto_2': { value: 'OASST1, FLAN v2', page: 4 },
  'paper_014|col_auto_0': {
    value: 'Direct Preference Optimization (no RL)',
    page: 2,
  },
  'paper_014|col_auto_1': {
    value: 'Equivalent to RLHF, simpler pipeline',
    page: 3,
  },
  'paper_014|col_auto_2': { value: 'Anthropic HH, Reddit TL;DR', page: 5 },
  'paper_015|col_auto_0': { value: 'Sparse Mixture-of-Experts', page: 2 },
  'paper_015|col_auto_1': { value: '32 experts, top-2 routing', page: 3 },
  'paper_015|col_auto_2': { value: 'FLAN 2022 collection', page: 4 },
}

const MOCK_VALUES = [
  'Transformer-based architecture with multi-head attention',
  'Achieves state-of-the-art results on multiple benchmarks',
  'Reduces computational cost by 40-60%',
  'Uses contrastive learning with data augmentation',
  'Pre-trained on large-scale web corpus (>1T tokens)',
  'Fine-tuned with RLHF for instruction following',
  'Evaluated on GLUE, SuperGLUE, and SQuAD',
  '8 x NVIDIA A100 80GB GPUs',
  'Linear time complexity O(n)',
  'Outperforms baseline by 3.2% on accuracy',
  'Knowledge distillation from larger teacher model',
  'Mixture-of-Experts with top-2 routing',
  'Low-rank adaptation reduces parameters by 10000x',
  'Sliding window attention for long sequences',
  'Cross-lingual transfer learning approach',
]

// Simple deterministic hash matching Python's hash() % 100 behavior
function simpleHash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  }
  return ((h % 100) + 100) % 100
}

// Seeded random matching Python's random.seed + random.choice/randint
function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff
    return s / 0x7fffffff
  }
}

export function getMockCellValue(
  paperId: string,
  columnId: string,
  columnPrompt = '',
): MockCellValue | null {
  const key = `${paperId}|${columnId}`
  if (MOCK_CELL_DATA[key]) {
    return MOCK_CELL_DATA[key]
  }

  const seed = simpleHash(`${paperId}_${columnId}`)
  if (seed < 70) {
    const rng = seededRandom(seed)
    const value =
      MOCK_VALUES[Math.floor(rng() * MOCK_VALUES.length)] +
      (columnPrompt ? ` (${columnPrompt.slice(0, 30)})` : '')
    return {
      value,
      page: Math.floor(rng() * 10) + 1,
    }
  }
  return null
}
