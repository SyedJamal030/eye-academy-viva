import type { EyeSide, FindingItem } from '#/types/viva'

interface KeywordRule {
  idPrefixOrId: string
  patterns: RegExp[]
}

const KEYWORD_RULES: KeywordRule[] = [
  {
    idPrefixOrId: 'va_',
    patterns: [
      /\bvision\b/i,
      /\bvisual acuity\b/i,
      /\bacuity\b/i,
      /\bsnellen\b/i,
      /\b6\/\d+\b/i,
    ],
  },
  {
    idPrefixOrId: 'iop_',
    patterns: [
      /\biop\b/i,
      /\bintraocular pressure\b/i,
      /\beye pressure\b/i,
      /\btonometry\b/i,
      /\bgoldmann\b/i,
      /\bmmhg\b/i,
    ],
  },
  {
    idPrefixOrId: 'conj_',
    patterns: [
      /\bconjunctiva\b/i,
      /\bconjunctival\b/i,
      /\bciliary flush\b/i,
      /\binjection\b/i,
    ],
  },
  {
    idPrefixOrId: 'cornea_',
    patterns: [
      /\bcornea\b/i,
      /\bcorneal\b/i,
      /\boedema\b/i,
      /\bedema\b/i,
      /\bhazy\b/i,
      /\bcloudiness\b/i,
    ],
  },
  {
    idPrefixOrId: 'ac_',
    patterns: [
      /\banterior chamber\b/i,
      /\bchamber depth\b/i,
      /\bvan herick\b/i,
      /\bshallow chamber\b/i,
    ],
  },
  {
    idPrefixOrId: 'pupil_',
    patterns: [/\bpupil\b/i, /\bpupils\b/i, /\bpupillary\b/i, /\bpen torch\b/i],
  },
  {
    idPrefixOrId: 'rapd',
    patterns: [/\brapd\b/i, /\bafferent pupillary\b/i, /\bswinging light\b/i],
  },
  {
    idPrefixOrId: 'lens_',
    patterns: [/\blens\b/i, /\bnuclear sclerosis\b/i, /\bcataract\b/i],
  },
  {
    idPrefixOrId: 'gonio_',
    patterns: [
      /\bgonioscopy\b/i,
      /\bgonio\b/i,
      /\bsy?nechi\b/i,
      /\bperipheral anterior synechiae\b/i,
      /\biridotrabecular\b/i,
      /\bzeiss\b/i,
    ],
  },
  {
    idPrefixOrId: 'fundus_',
    patterns: [
      /\boptic disc\b/i,
      /\boptic nerve\b/i,
      /\bfundus\b/i,
      /\bcup[- ]to[- ]disc\b/i,
      /\bmacula\b/i,
      /\bbiomicroscopy\b/i,
    ],
  },
  {
    idPrefixOrId: 'refraction',
    patterns: [
      /\brefraction\b/i,
      /\bglasses\b/i,
      /\bfocimetry\b/i,
      /\bdioptres?\b/i,
      /\bdiopters?\b/i,
    ],
  },
  {
    idPrefixOrId: 'axial_length',
    patterns: [/\baxial length\b/i, /\bbiometry\b/i],
  },
  {
    idPrefixOrId: 'oct',
    patterns: [
      /\boct\b/i,
      /\boptical coherence tomography\b/i,
      /\btomography\b/i,
    ],
  },
  {
    idPrefixOrId: 'bp',
    patterns: [/\bblood pressure\b/i, /\bbp\b/i],
  },
  {
    idPrefixOrId: 'u_and_e',
    patterns: [
      /\burea\b/i,
      /\belectrolytes?\b/i,
      /\bu&e\b/i,
      /\bu and e\b/i,
      /\bbloods?\b/i,
    ],
  },
]

const HISTORY_ONLY_PATTERNS: RegExp[] = [
  /\bmedications?\b/i,
  /\bmeds\b/i,
  /\ballerg(?:y|ies)\b/i,
  /\bfamily history\b/i,
  /\bpast medical\b/i,
  /\bpast ocular\b/i,
  /\bamlodipine\b/i,
  /\bchlorphenamine\b/i,
  /\bsulfonamide\b/i,
]

const DIAGNOSIS_STATEMENT_PATTERNS: RegExp[] = [
  /\bacute (?:primary )?angle closure\b/i,
  /\bangle[- ]closure glaucoma\b/i,
  /\bmy diagnosis\b/i,
  /\bworking diagnosis\b/i,
  /\bdiagnosis is\b/i,
  /\bmanagement is\b/i,
  /\bprimary management\b/i,
  /\bimmediate management\b/i,
  /\bperipheral iridotomy\b/i,
  /\bacetazolamide\b/i,
  /\bpilocarpine\b/i,
]

export function detectRequestedEye(utterance: string): EyeSide {
  const q = utterance.toLowerCase()
  const hasRight = /\bright\b|\bod\b/.test(q)
  const hasLeft = /\bleft\b|\bos\b/.test(q)
  const hasBoth = /\bboth\b|\bou\b/.test(q)

  if (hasBoth || (hasRight && hasLeft)) return 'both'
  if (hasRight) return 'right'
  if (hasLeft) return 'left'
  return null
}

export function findMatchingFindings(
  utterance: string,
  findings: FindingItem[],
): FindingItem[] {
  const q = utterance.trim().toLowerCase()
  if (!q || findings.length === 0) return []

  const isHistoryOnly =
    HISTORY_ONLY_PATTERNS.some((re) => re.test(q)) &&
    !/\b(?:check|examine|measure|test|assess|what is|what are)\b/i.test(q)
  if (isHistoryOnly) return []

  const isDiagnosisStatement =
    DIAGNOSIS_STATEMENT_PATTERNS.some((re) => re.test(q)) &&
    !/\b(?:check|examine|measure|test|gonioscopy|iop|pupil|vision|acuity|blood pressure|bp)\b/i.test(
      q,
    )
  if (isDiagnosisStatement) return []

  const requestedEye = detectRequestedEye(q)
  const matchedIds = new Set<string>()

  for (const rule of KEYWORD_RULES) {
    if (rule.patterns.some((re) => re.test(q))) {
      for (const item of findings) {
        if (
          item.id === rule.idPrefixOrId ||
          item.id.startsWith(rule.idPrefixOrId)
        ) {
          matchedIds.add(item.id)
        }
      }
    }
  }

  return findings.filter((item) => {
    if (!matchedIds.has(item.id)) return false
    if (!requestedEye || requestedEye === 'both') return true
    if (item.eye === 'both' || item.eye === null) return true
    return item.eye === requestedEye
  })
}

export function formatFindingForDisplayAndSpeech(item: FindingItem): {
  spokenText: string
  displaySummary: string
} {
  const eyeLabel =
    item.eye === 'right'
      ? 'Right eye'
      : item.eye === 'left'
        ? 'Left eye'
        : item.eye === 'both'
          ? 'Both eyes'
          : 'General'

  if (!item.available) {
    const reason = item.unavailable_reason ?? 'Not available in this case.'
    return {
      spokenText: `${eyeLabel} ${item.label} is not available. ${reason}`,
      displaySummary: `Unavailable: ${reason}`,
    }
  }

  const valueStr = item.value !== null ? String(item.value) : 'Recorded'
  const unitStr =
    item.unit && !valueStr.toLowerCase().includes(item.unit.toLowerCase())
      ? ` ${item.unit}`
      : ''
  const methodStr = item.method ? ` via ${item.method}` : ''

  return {
    spokenText: `${eyeLabel} ${item.label} is ${valueStr}${unitStr}${methodStr}.`,
    displaySummary: `${valueStr}${unitStr}${item.method ? ` · ${item.method}` : ''}`,
  }
}
