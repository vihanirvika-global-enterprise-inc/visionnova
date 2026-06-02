export function cookies() {
  return {
    set(_name: string, _value: string, _opts?: object) {},
    get(_name: string): { value: string } | undefined { return undefined },
    delete(_name: string) {},
  }
}

export function headers() {
  return {}
}
