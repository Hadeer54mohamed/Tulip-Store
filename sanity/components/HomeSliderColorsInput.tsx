import { set, unset, useFormValue, type ArrayOfPrimitivesInputProps } from "sanity"

/** Lets editors tick which of THIS product's colours appear as cards in the home page section. */
export function HomeSliderColorsInput(props: ArrayOfPrimitivesInputProps) {
  const colors = (useFormValue(["colors"]) as { name?: string }[] | undefined) || []
  const names = colors.map((c) => c?.name).filter((n): n is string => !!n)
  const value = ((props.value as string[] | undefined) || []).filter((v) => names.includes(v))

  const toggle = (name: string) => {
    const next = value.includes(name) ? value.filter((v) => v !== name) : [...value, name]
    props.onChange(next.length ? set(next) : unset())
  }

  if (!names.length)
    return <p style={{ opacity: 0.7 }}>Add colors above first, then pick which ones show on the home page.</p>
  return (
    <div style={{ display: "grid", gap: 8 }}>
      {names.map((name) => (
        <label key={name} style={{ display: "flex", gap: 8, alignItems: "center", cursor: "pointer" }}>
          <input type="checkbox" checked={value.includes(name)} onChange={() => toggle(name)} />
          {name}
        </label>
      ))}
    </div>
  )
}
