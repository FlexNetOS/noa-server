package rtt

default allow = false

allow {
  input.id
  input.tools
  input.lanes
  input.providers
  not violates_budget
  not bad_region
}

violates_budget {
  input.budget.max_request_usd
  input.budget.estimated_usd > input.budget.max_request_usd
}

bad_region {
  some r
  required := {r | r := input.residency.required[_]}
  not input.residency.region == required[_]
}
