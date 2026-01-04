# Ensemble Documentation

Welcome to the Ensemble project documentation! 🎵

---

## 📚 **Documentation Directory**

### **🤖 Working with AI Agents**
- [**AI Agent Workflow Guide**](./AI_AGENT_WORKFLOW_GUIDE.md) ⭐ **START HERE**
  - How to work effectively with multiple AI agents
  - When to start a new agent vs continue with current one
  - What context to provide for different scenarios
  - Templates and examples for common workflows

---

### **🏗️ Build Process**
- [**Build Process Overview**](./build-process/README.md)
  - Step-by-step feature implementation
  - 18+ completed steps documented
  - Design decisions and technical details
  - Maintenance and cleanup logs

**Recent Completions:**
- [Step 26: Unified Gig Ownership](./build-process/step-26-unify-gig-ownership.md)
- [Step 25: Pending Invitations Privacy Fix](./build-process/step-25-pending-invitations-fix.md)
- [Step 24: Foreign Key Index Optimization](./build-process/step-24-foreign-key-indexes.md)
- [Step 23: RLS Performance Optimization](./build-process/step-23-rls-performance-optimization.md)

---

### **🚀 Future Enhancements**
- [**Next Steps Roadmap**](./future-enhancements/next-steps.md)
  - Prioritized feature list
  - Detailed implementation plans
  - Complexity ratings
  - Dependencies and prerequisites

**Key Planned Features:**
- Notifications system (email + in-app)
- Advanced setlist features
- Manager money dashboard
- Mobile app integration

---

### **🔧 Troubleshooting**
- [**Troubleshooting Guide Directory**](./troubleshooting/README.md)
  - [RLS Debugging Saga](./troubleshooting/rls-debugging-saga.md) - Circular dependency debugging
  - Common issues and solutions
  - Debugging protocols

---

### **⚙️ Setup & Configuration**
- [**Google Calendar OAuth Setup**](./setup/google-calendar-oauth-setup.md)
  - Google Cloud Console configuration
  - OAuth credentials setup
  - Environment variables

---

### **📱 Mobile Integration**
- [**Mobile Integration Guide**](./mobile-integration-guide.md)
  - Planning for Expo React Native companion app
  - Shared types and logic
  - API considerations

---

### **🎨 Design & UX**
- [**Theme System**](./features/theming-guide.md)
  - Multiple theme options (zinc, slate, rose, violet, etc.)
  - Dark mode support
  - Theme configuration and customization

---

### **🔐 Security & Safety**
- [**Safety Safeguards**](./SAFETY_SAFEGUARDS.md)
  - Database protection rules
  - Destructive command protocols
  - RLS debugging best practices

---

## 🎯 **Quick Links by Task**

### **I want to...**

**Start a new feature:**
1. Read [AI Agent Workflow Guide](./AI_AGENT_WORKFLOW_GUIDE.md)
2. Check [Next Steps Roadmap](./future-enhancements/next-steps.md)
3. Open new agent with proper context

**Understand how something was built:**
1. Check [Build Process](./build-process/README.md)
2. Find the relevant step documentation
3. Review code and decisions

**Debug an issue:**
1. Check [Troubleshooting](./troubleshooting/README.md)
2. Review related build step docs
3. Check `.cursorrules` for patterns

**Set up a new integration:**
1. Check [Setup guides](./setup/)
2. Follow step-by-step instructions
3. Update `.env.local`

**Plan a new feature:**
1. Review [Next Steps](./future-enhancements/next-steps.md)
2. Check dependencies and prerequisites
3. Create implementation plan

---

## 📖 **Documentation Standards**

All documentation in this project follows these principles:

### **1. Always Include:**
- ✅ **Overview** - What is this about?
- ✅ **Context** - Why was this built/needed?
- ✅ **Implementation** - How was it built?
- ✅ **Testing** - How to verify it works?
- ✅ **Next Steps** - What's next?

### **2. Use Clear Structure:**
- Start with TL;DR for long docs
- Use headers and sections
- Include code examples
- Add tables for complex info

### **3. Keep Updated:**
- Update after each major feature
- Document design decisions
- Note known limitations
- Reference related docs

---

## 🗂️ **File Organization**

```
docs/
├── AI_AGENT_WORKFLOW_GUIDE.md        ⭐ How to work with AI agents
├── README.md                          (this file)
├── build-process/                     
│   ├── README.md                      Build steps overview
│   ├── step-0-project-setup.md       
│   ├── step-1-supabase-database.md   
│   ├── ...
│   └── step-18-optional-projects.md  Latest feature
├── future-enhancements/               
│   ├── README.md                      Feature planning overview
│   ├── next-steps.md                  ⭐ Main roadmap
│   ├── dashboard-improvements.md      
│   ├── calendar-integration-roadmap.md
│   └── ...
├── troubleshooting/                   
│   ├── README.md                      Troubleshooting guide
│   └── rls-debugging-saga.md          RLS debugging story
├── setup/                             
│   └── google-calendar-oauth-setup.md Configuration guides
├── deployment/                        
│   ├── post-deployment-checklist.md   Deployment process
│   └── migration-testing-checklist.md Migration testing guide
├── features/                          
│   └── theming-guide.md              Theme customization
├── maintenance/                       
│   └── audit-2025-01-19.md           Code quality audits
├── agent-protocols/                   
│   ├── database-safety.md            Database operation protocols
│   └── README.md                     Agent protocols overview
├── mobile-integration-guide.md        Mobile app planning
└── SAFETY_SAFEGUARDS.md              Security rules
```

---

## 🎓 **For New Developers**

If you're new to this project:

1. **Start Here:**
   - Read [.cursorrules](../.cursorrules) - Project architecture
   - Read [BUILD_STEPS.md](../BUILD_STEPS.md) - Current status
   - Read [AI Agent Workflow Guide](./AI_AGENT_WORKFLOW_GUIDE.md)

2. **Understand the Domain:**
   - This is a gig management app for musicians
   - Read the build process docs in order
   - See how features were built incrementally

3. **Set Up Your Environment:**
   - Follow setup guides in `setup/`
   - Install dependencies
   - Configure environment variables

4. **Start Contributing:**
   - Pick a feature from `next-steps.md`
   - Review related build step docs
   - Open an AI agent with proper context
   - Build and document!

---

## 🤝 **Contributing to Documentation**

When adding new docs:

1. **Choose the right location:**
   - Build process → `build-process/`
   - Future plans → `future-enhancements/`
   - Problems/bugs → `troubleshooting/`
   - Configuration → `setup/`

2. **Follow the template:**
   - See existing docs for structure
   - Use clear headers and sections
   - Include code examples

3. **Update indexes:**
   - Update this README if adding major doc
   - Update section README files
   - Update `BUILD_STEPS.md` if feature is complete

4. **Use the TEMPLATE:**
   - See `build-process/TEMPLATE.md` for feature docs

---

## 📞 **Questions?**

- Check existing documentation first
- Review `.cursorrules` for architecture questions
- Check `troubleshooting/` for known issues
- Reference `next-steps.md` for future plans

---

**Last Updated:** November 20, 2025

**Happy building! 🚀**

