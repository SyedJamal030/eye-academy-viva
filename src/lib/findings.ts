import caseData from '../data/case-ea-viva-001.json'
import type { EyeSide, FindingItem } from '../types/viva'

const ALL_FINDINGS = caseData.findings as FindingItem[]

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

  const keywordRules: Array<{ idPrefixOrId: string; patterns: RegExp[] }> = [
    {
      idPrefixOrId: 'va_',
      patterns: [
        /\bvision\b/,
        /\bvisual acuity\b/,
        /\bacuity\b/,
        /\bsnellen\b/,
        /\b6\/\d+\b/,
      ],
    },
    {
      idPrefixOrId: 'iop_',
      patterns: [
        /\biop\b/,
        /\bintraocular\b/,
        /\bpressure\b/,
        /\btonometry\b/,
        /\bgoldmann\b/,
        /\bmmhg\b/,
      ],
    },
    {
      idPrefixOrId: 'conj_',
      patterns: [
        /\bconjunctiva\b/,
        /\bredness\b/,
        /\binjection\b/,
        /\bflush\b/,
        /\bciliary\b/,
      ],
    },
    {
      idPrefixOrId: 'cornea_',
      patterns: [
        /\bcornea\b/,
        /\bcorneal\b/,
        /\boedema\b/,
        /\bedema\b/,
        /\bhazy\b/,
        /\bcloud/i,
      ],
    },
    {
      idPrefixOrId: 'ac_',
      patterns: [
        /\banterior chamber\b/,
        /\bchamber depth\b/,
        /\bvan herick\b/,
        /\bshallow\b/,
      ],
    },
    {
      idPrefixOrId: 'pupil_',
      patterns: [/\bpupil\b/, /\bdilat/i, /\breactiv/i, /\bpen torch\b/],
    },
    {
      idPrefixOrId: 'rapd',
      patterns: [/\brapd\b/, /\bafferent\b/, /\bswinging\b/],
    },
    {
      idPrefixOrId: 'lens_',
      patterns: [/\blens\b/, /\bsclerosis\b/, /\bcataract/i],
    },
    {
      idPrefixOrId: 'gonio_',
      patterns: [
        /\bgonioscopy\b/,
        /\bangle\b/,
        /\bsy平台/i,
        /\bsy想/i,
        /\biridotrabecular\b/,
        /\bzeiss\b/,
      ],
    },
    {
      idPrefixOrId: 'fundus_',
      patterns: [
        /\boptic disc\b/,
        /\bdisc\b/,
        /\bfundus\b/,
        /\bcup\b/,
        /\bmacula\b/,
        /\bbiomicroscopy\b/,
      ],
    },
    {
      idPrefixOrId: 'refraction',
      patterns: [
        /\brefraction\b/,
        /\bglasses\b/,
        /\bfocimetry\b/,
        /\bdiopt/i,
        /\blong-sighted\b/,
      ],
    },
    {
      idPrefixOrId: 'axial_length',
      patterns: [/\baxial\b/, /\bbiometry\b/, /\blength\b/],
    },
    { idPrefixOrId: 'oct', patterns: [/\boct\b/, /\btomography\b/] },
    {
      idPrefixOrId: 'bp',
      patterns: [/\bblood pressure\b/, /\bbp\b/, /\bcuff\b/],
    },
    {
      idPrefixOrId: 'u_and_e',
      patterns: [
        /\burea\b/,
        /\belectrolyte/i,
        /\bu&e\b/,
        /\bu and e\b/,
        /\bbloods?\b/,
        /\bkidney\b/,
      ],
    },
  ]

  const matchedIds = new Set<string>()
  for (const rule of keywordRules) {
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
