---
layout: default
title: Home
permalink: /
---

{% capture readme %}
{% include_relative README.md %}
{% endcapture %}
{% assign readme_links = readme
  | replace: '.md)', '.html)'
  | replace: '.md#', '.html#' %}
{{ readme_links | markdownify }}
