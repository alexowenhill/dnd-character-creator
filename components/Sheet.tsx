'use client'

import { formatModifier, type ComputedSheet } from '@/lib/character'
import { ALIGNMENTS } from '@/lib/srd'
import { armourById, weaponById } from '@/lib/equipment'

function Box({ label, value, note }: { label: string; value: string | number; note?: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-center">
      <div className="text-[10px] uppercase tracking-wider text-stone-500">{label}</div>
      <div className="mt-0.5 text-2xl font-semibold text-stone-100">{value}</div>
      {note && <div className="mt-0.5 text-[11px] leading-tight text-stone-500">{note}</div>}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-medium uppercase tracking-wider text-stone-500">{title}</h3>
      {children}
    </section>
  )
}

export function Sheet({ sheet }: { sheet: ComputedSheet }) {
  const c = sheet.character
  const alignment = ALIGNMENTS.find((entry) => entry.id === c.alignmentId)

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold text-stone-100">{c.name}</h1>
        <p className="text-sm text-stone-400">
          Level {c.level} {sheet.raceName} {sheet.className}
          {sheet.subclassName ? ` — ${sheet.subclassName}` : ''}
        </p>
        <p className="text-xs text-stone-500">
          {sheet.backgroundName}
          {alignment ? ` · ${alignment.name}` : ''}
          {c.playerName ? ` · played by ${c.playerName}` : ''}
        </p>
      </header>

      {/* Ability scores */}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {sheet.abilities.map((ability) => (
          <div
            key={ability.key}
            className="rounded-xl border border-white/10 bg-white/5 px-2 py-3 text-center"
            title={`${ability.base} rolled${ability.racial ? ` + ${ability.racial} racial` : ''}${
              ability.improvement ? ` + ${ability.improvement} improvement` : ''
            }`}
          >
            <div className="text-[10px] uppercase tracking-wider text-stone-500">{ability.short}</div>
            <div className="text-2xl font-semibold text-stone-100">{ability.total}</div>
            <div className="text-xs text-amber-500/90">{formatModifier(ability.modifier)}</div>
            {(ability.racial > 0 || ability.improvement > 0) && (
              <div className="mt-0.5 text-[10px] text-stone-600">
                {ability.base}
                {ability.racial ? ` +${ability.racial}` : ''}
                {ability.improvement ? ` +${ability.improvement}` : ''}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Headline combat numbers */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Box label="Hit points" value={sheet.hitPoints} note={sheet.hitDice} />
        <Box label="Armour class" value={sheet.armourClass} note={sheet.armourNote} />
        <Box label="Initiative" value={formatModifier(sheet.initiative)} />
        <Box label="Speed" value={`${sheet.speed} ft`} />
        <Box label="Proficiency" value={formatModifier(sheet.proficiencyBonus)} />
        <Box label="Passive Perception" value={sheet.passivePerception} />
        {sheet.spellcasting && (
          <>
            <Box
              label="Spell save DC"
              value={sheet.spellcasting.saveDc}
              note={sheet.spellcasting.abilityName}
            />
            <Box label="Spell attack" value={formatModifier(sheet.spellcasting.attackBonus)} />
          </>
        )}
      </div>

      {sheet.armourWarning && (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          {sheet.armourWarning}
        </p>
      )}

      {sheet.attacks.length > 0 && (
        <Section title="Attacks">
          <div className="overflow-hidden rounded-xl border border-white/10">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-white/5 text-[11px] uppercase tracking-wider text-stone-500">
                  <th className="px-3 py-2 text-left font-medium">Weapon</th>
                  <th className="px-3 py-2 text-right font-medium">Attack</th>
                  <th className="px-3 py-2 text-left font-medium">Damage</th>
                </tr>
              </thead>
              <tbody>
                {sheet.attacks.map((attack) => (
                  <tr key={attack.name} className="border-t border-white/5">
                    <td className="px-3 py-2 text-stone-200">
                      {attack.name}
                      {attack.note && <span className="ml-2 text-xs text-stone-500">{attack.note}</span>}
                      {!attack.proficient && (
                        <span className="ml-2 text-xs text-amber-400/80">not proficient</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-stone-300">
                      {formatModifier(attack.attackBonus)}
                    </td>
                    <td className="px-3 py-2 text-stone-300">
                      {attack.damage}{' '}
                      <span className="text-xs text-stone-500">{attack.damageType}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      <div className="grid gap-8 sm:grid-cols-2">
        <Section title="Saving throws">
          <ul className="space-y-1">
            {sheet.savingThrows.map((save) => (
              <li
                key={save.key}
                className="flex items-center justify-between rounded-lg px-2 py-1 text-sm"
              >
                <span className={save.proficient ? 'text-stone-200' : 'text-stone-500'}>
                  {save.proficient && <span className="mr-1.5 text-amber-500">●</span>}
                  {save.name}
                </span>
                <span className="font-mono text-stone-300">{formatModifier(save.modifier)}</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Skills">
          <ul className="space-y-0.5">
            {sheet.skills.map((skill) => (
              <li
                key={skill.key}
                className="flex items-center justify-between rounded-lg px-2 py-0.5 text-sm"
              >
                <span className={skill.proficient ? 'text-stone-200' : 'text-stone-500'}>
                  {skill.proficient && <span className="mr-1.5 text-amber-500">●</span>}
                  {skill.name}
                </span>
                <span className="font-mono text-stone-400">{formatModifier(skill.modifier)}</span>
              </li>
            ))}
          </ul>
        </Section>
      </div>

      {sheet.spellcasting && (
        <Section title="Spellcasting">
          <div className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="flex flex-wrap gap-2">
              {sheet.spellcasting.slots.map((slot) => (
                <span
                  key={slot.level}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-stone-300"
                >
                  Level {slot.level}: <span className="font-semibold text-stone-100">{slot.count}</span> slots
                </span>
              ))}
            </div>
            <p className="text-xs text-stone-400">
              {sheet.spellcasting.cantripsKnown} cantrips ·{' '}
              {sheet.spellcasting.spellsKnown} spells{' '}
              {sheet.spellcasting.prepared ? 'prepared' : 'known'}
              {sheet.spellcasting.spellbook
                ? ` from a spellbook of ${sheet.spellcasting.spellbook}`
                : ''}{' '}
              · cast using {sheet.spellcasting.abilityName}
            </p>
            {(c.cantrips?.length || c.spells?.length) ? (
              <div className="space-y-2">
                {c.cantrips?.length ? (
                  <div>
                    <div className="text-xs text-stone-500">Cantrips</div>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {c.cantrips.map((spell) => (
                        <span key={spell} className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs text-stone-300">
                          {spell}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
                {c.spells?.length ? (
                  <div>
                    <div className="text-xs text-stone-500">Spells</div>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {c.spells.map((spell) => (
                        <span key={spell} className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs text-stone-300">
                          {spell}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="text-xs text-stone-500">
                No spells picked yet — choose {sheet.spellcasting.spellsKnown} and{' '}
                {sheet.spellcasting.cantripsKnown} cantrips before you play.
              </p>
            )}
          </div>
        </Section>
      )}

      <div className="grid gap-8 sm:grid-cols-2">
        <Section title={`${sheet.className} features`}>
          <ul className="space-y-1 text-sm text-stone-300">
            {sheet.features.map((feature) => (
              <li key={feature}>· {feature}</li>
            ))}
          </ul>
        </Section>

        <Section title="Racial traits">
          <ul className="space-y-1 text-sm text-stone-300">
            {sheet.traits.map((trait) => (
              <li key={trait}>· {trait}</li>
            ))}
          </ul>
        </Section>
      </div>

      {(c.equipment?.armourId || c.equipment?.shield || c.equipment?.weaponIds?.length || c.equipment?.extras?.length) && (
        <Section title="Equipment">
          <div className="flex flex-wrap gap-1.5">
            {c.equipment.armourId && (
              <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs text-stone-300">
                {armourById(c.equipment.armourId)?.name ?? c.equipment.armourId}
              </span>
            )}
            {c.equipment.shield && (
              <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs text-stone-300">
                Shield
              </span>
            )}
            {c.equipment.weaponIds?.map((id) => (
              <span key={id} className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs text-stone-300">
                {weaponById(id)?.name ?? id}
              </span>
            ))}
            {c.equipment.extras?.map((item) => (
              <span key={item} className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs text-stone-400">
                {item}
              </span>
            ))}
          </div>
        </Section>
      )}

      {c.rolls && (
        <Section title="The dice that made this character">
          <div className="flex flex-wrap gap-2">
            {sheet.abilities.map((ability) => {
              const dice = c.rolls?.[ability.key]
              if (!dice) return null
              return (
                <span
                  key={ability.key}
                  className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-stone-400"
                >
                  {ability.short} {ability.base}{' '}
                  <span className="text-stone-600">({dice.join(', ')})</span>
                </span>
              )
            })}
          </div>
        </Section>
      )}

      {c.notes && (
        <Section title="Notes">
          <p className="whitespace-pre-wrap text-sm text-stone-300">{c.notes}</p>
        </Section>
      )}
    </div>
  )
}
