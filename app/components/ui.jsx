import { Children, cloneElement, isValidElement } from "react";

// Thin wrappers over Polaris web components (<s-*>) that keep the approved design's
// structure: page header with actions, cards, banners, badges, forms and tables.

const on = (v) => (v ? true : undefined); // custom elements treat any set attribute as true

/** Collects the page title, back link, badge and actions; AppShell turns them into <s-page>. */
// eslint-disable-next-line no-unused-vars
export function PageHeader(_props) {
  return null;
}

export function AppShell({ children }) {
  const kids = Children.toArray(children);
  const header = kids.find((k) => isValidElement(k) && k.type === PageHeader);
  const rest = kids.filter((k) => k !== header);
  const { title, back, badge, children: actions } = header?.props ?? {};
  const buttons = Children.toArray(actions).filter(isValidElement);

  return (
    <div style={{ width: "100%", maxWidth: "100%", margin: 0, padding: 0, boxSizing: "border-box" }}>
      {header && (
        <s-page heading={title} full-width="true">
          {back && <s-link slot="breadcrumb-actions" href={back}>Back</s-link>}
          {badge && <span slot="accessory">{badge}</span>}
          {buttons.map((b, i) =>
            cloneElement(b, { key: i, slot: b.props.variant === "primary" ? "primary-action" : "secondary-actions" }),
          )}
        </s-page>
      )}
      <div style={{ width: "100%", maxWidth: "100%", margin: 0, padding: 0, boxSizing: "border-box" }}>
        {rest}
      </div>
    </div>
  );
}

/** In-app link. Relative hrefs are handled by App Bridge. */
export function A({ to, children }) {
  return <s-link href={to}>{children}</s-link>;
}

export function Btn({ to, href, type = "button", variant, small, loading, children, ...rest }) {
  return (
    <s-button
      href={to ?? href}
      type={to || href ? undefined : type}
      variant={variant === "primary" ? "primary" : small ? "tertiary" : "secondary"}
      tone={variant === "critical" ? "critical" : undefined}
      loading={on(loading)}
      {...rest}
    >
      {children}
    </s-button>
  );
}

/** A section. `aside` puts it in the page's side column; `flush` removes padding (for tables). */
export function Card({ title, aside, flush, children }) {
  return (
    <s-section heading={title} slot={aside ? "aside" : undefined} padding={flush ? "none" : undefined}>
      {flush ? children : <s-stack gap="base">{children}</s-stack>}
    </s-section>
  );
}

export function Banner({ tone = "info", title, action, children }) {
  return (
    <s-banner tone={tone} heading={title}>
      {children}
      {action && cloneElement(action, { slot: "secondary-actions" })}
    </s-banner>
  );
}

export function Badge({ tone = "neutral", children }) {
  return <s-badge tone={tone}>{children}</s-badge>;
}

export function ErrorList({ title = "Fix the following", errors }) {
  if (!errors?.length) return null;
  return (
    <s-banner tone="critical" heading={title}>
      <s-unordered-list>
        {errors.map((e) => (
          <s-list-item key={e}>{e}</s-list-item>
        ))}
      </s-unordered-list>
    </s-banner>
  );
}

/** Gives its single child field a label and helper text. */
export function Field({ label, hint, children }) {
  return cloneElement(children, { label, details: hint });
}

export function Input({ type, onChange, ...props }) {
  const handlers = onChange ? { onInput: onChange, onChange } : {};
  if (type === "date") return <s-date-field {...handlers} {...props} />;
  if (type === "search") return <s-search-field {...handlers} {...props} />;
  return <s-text-field {...handlers} {...props} />;
}

export function NumberInput({ onChange, ...props }) {
  const handlers = onChange ? { onInput: onChange, onChange } : {};
  return <s-number-field {...handlers} {...props} />;
}

export function Select({ children, onChange, ...props }) {
  const options = Children.map(children, (c) =>
    isValidElement(c) ? <s-option value={c.props.value}>{c.props.children}</s-option> : c,
  );
  return (
    <s-select onChange={onChange} {...props}>
      {options}
    </s-select>
  );
}

export const TextArea = (props) => <s-text-area rows={2} {...props} />;

export function Check({ label, defaultChecked, ...props }) {
  return <s-checkbox label={label} checked={on(defaultChecked)} {...props} />;
}

export function DataTable({ head, children }) {
  return (
    <s-table>
      <s-table-header-row>
        {head.map((h) => (
          <s-table-header key={h}>{h}</s-table-header>
        ))}
      </s-table-header-row>
      <s-table-body>{children}</s-table-body>
    </s-table>
  );
}

export const TRow = (props) => <s-table-row {...props} />;
export const TCell = (props) => <s-table-cell {...props} />;

export function Row({ label, value, bold }) {
  return (
    <s-stack direction="inline" justifyContent="space-between" gap="base">
      <s-text color={bold ? undefined : "subdued"} type={bold ? "strong" : undefined}>{label}</s-text>
      <s-text type={bold ? "strong" : undefined}>{value}</s-text>
    </s-stack>
  );
}

export function PriceBox({ children }) {
  return (
    <s-box padding="base" border="base" borderRadius="base">
      <s-stack gap="small-200">{children}</s-stack>
    </s-box>
  );
}
