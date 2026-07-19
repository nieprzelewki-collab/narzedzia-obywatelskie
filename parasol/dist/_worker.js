// NARZĘDZIA OBYWATELSKIE - statyczny parasol rodziny narzędzi.
export default {
  async fetch(request, env) {
    return env.ASSETS.fetch(request);
  },
};
