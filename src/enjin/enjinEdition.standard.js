// Standard builds resolve the optional edition entry to this inert module so
// the production game never ships or mounts Enjin UI code.
export async function mountEnjinEdition() {
  return null;
}
