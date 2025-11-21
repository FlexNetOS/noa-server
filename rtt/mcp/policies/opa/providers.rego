package rtt.providers
default ok = false
ok {
  some p
  p := input.providers[_]
  p == data.allowed.providers[_]
}
