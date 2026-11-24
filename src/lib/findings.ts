import caseData from '#/data/case-ea-viva-001.json'
import type { EyeSide, FindingItem } from '#/types/viva'

const ALL_FINDINGS = caseData.findings as FindingItem[]

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
      /\bintraocular\b/i,
      /\bpressure\b/i,
      /\btonometry\b/i,
      /\bgoldmann\b/i,
      /\bmmhg\b/i,
    ],
  },
  {
    idPrefixOrId: 'conj_',
    patterns: [
      /\bconjunctiva\b/i,
      /\bredness\b/i,
      /\binjection\b/i,
      /\bflush\b/i,
      /\bciliary\b/i,
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
      /\bcloud/i,
    ],
  },
  {
    idPrefixOrId: 'ac_',
    patterns: [
      /\banterior chamber\b/i,
      /\bchamber depth\b/i,
      /\bvan herick\b/i,
      /\bshallow\b/i,
    ],
  },
  {
    idPrefixOrId: 'pupil_',
    patterns: [/\bpupil\b/i, /\bdilat/i, /\breactiv/i, /\bpen torch\b/i],
  },
  {
    idPrefixOrId: 'rapd',
    patterns: [/\brapd\b/i, /\bafferent\b/i, /\bswinging\b/i],
  },
  {
    idPrefixOrId: 'lens_',
    patterns: [/\blens\b/i, /\bsclerosis\b/i, /\bcataract/i],
  },
  {
    idPrefixOrId: 'gonio_',
    patterns: [
      /\bgonioscopy\b/i,
      /\bangle\b/i,
      /\bsy?nechi/i,
      /\bpas\b/i,
      /\biridotrabecular\b/i,
      /\bzeiss\b/i,
    ],
  },
  {
    idPrefixOrId: 'fundus_',
    patterns: [
      /\boptic disc\b/i,
      /\bdisc\b/i,
      /\bfundus\b/i,
      /\bcup\b/i,
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
      /\bdiopt/i,
      /\blong-sighted\b/i,
    ],
  },
  {
    idPrefixOrId: 'axial_length',
    patterns: [/\baxial\b/i, /\bbiometry\b/i, /\blength\b/i],
  },
  {
    idPrefixOrId: 'oct',
    patterns: [/\boct\b/i, /\btomography\b/i],
  },
  {
    idPrefixOrId: 'bp',
    patterns: [/\bblood pressure\b/i, /\bbp\b/i, /\bcuff\b/i],
  },
  {
    idPrefixOrId: 'u_and_e',
    patterns: [
      /\burea\b/i,
      /\belectrolyte/i,
      /\bu&e\b/i,
      /\bu and e\b/i,
      /\bbloods?\b/i,
      /\bkidney\b/i,
    ],
  },
]

export function getAllCaseFindings(): FindingItem[] {
  return ALL_FINDINGS
}

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

export function findMatchingFindings(utterance: string): FindingItem[] {
  const q = utterance.toLowerCase()
  const requestedEye = detectRequestedEye(q)

  const matchedIds = new Set<string>()
  for (const rule of KEYWORD_RULES) {
    if (rule.patterns.some((re) => re.test(q))) {
      for (const item of ALL_FINDINGS) {
        if (
          item.id === rule.idPrefixOrId ||
          item.id.startsWith(rule.idPrefixOrId)
        ) {
          matchedIds.add(item.id)
        }
      }
    }
  }

  return ALL_FINDINGS.filter((item) => {
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
