# NOVEM

**Privacy-First Collaborative Data Science Platform**

NOVEM is an end-to-end data science platform that combines local-first computation with selective cloud collaboration. Built for professionals who demand privacy, reproducibility, and resilience, NOVEM keeps your data and computation local while enabling seamless team collaboration through metadata synchronization.

## 🎯 Core Philosophy

- **Local-First**: All data and computation remain on your machine
- **Privacy by Design**: Only lightweight metadata syncs to the cloud
- **Offline-Capable**: Work up to 7 days without connectivity
- **Results-First Collaboration**: Share insights, not raw data
- **Enterprise-Ready**: Full audit trails, RBAC, and compliance support

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    NOVEM Desktop (Tauri)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │   React UI   │  │  Local Store │  │  Python Engine   │  │
│  │  (TypeScript)│  │   (DuckDB)   │  │    (FastAPI)     │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↕ (Metadata Only)
┌─────────────────────────────────────────────────────────────┐
│              Django Backend (REST API)                      │
│  • Authentication & Authorization                           │
│  • Workspace & Project Metadata                            │
│  • Collaboration & Invitations                             │
│  • Audit Logs & Analytics                                  │
└─────────────────────────────────────────────────────────────┘
```

## ✨ Key Features

### Authentication & Identity
- email/password authentication
- Explicit account lifecycle tracking (invited, registered, onboarded, active, suspended)
- Short-lived access tokens with refresh token rotation
- 7-day offline grace period for authenticated users

### Workspaces & Projects
- **Workspaces**: Ownership boundaries (personal, team, organization, client)
- **Projects**: Primary execution units with explicit RBAC
- Role-based permissions (Viewer, Analyst, Contributor, Lead)
- Invitation and join request workflows with state tracking
- Visibility controls (private, workspace-visible, discoverable)

### Data Management
- Multi-source data connectors powered by Meltano
- Local file import (CSV, Excel)
- Encrypted credential storage with rotation support
- Automatic schema inference and data profiling
- Dataset versioning and lineage tracking

### Analytics & ML
- **EDA**: Automated exploratory data analysis reports
- **Statistical Analysis**: Hypothesis testing, ANOVA, chi-square
- **Machine Learning**: AutoML, supervised learning, forecasting
- **Time Series**: Prophet, ARIMA, LSTM support
- **Unsupervised Learning**: Clustering, dimensionality reduction
- **Advanced Analytics**: Funnel analysis, cohort analysis, RFM, churn prediction

### Collaboration & Governance
- Results-first sharing (publish outputs, not raw data)
- Project-level publication controls
- Audit trails and access logs
- Backup/restore with recycle bin
- Community spaces (opt-in, privacy-preserving)

### User Experience
- Resource awareness (memory/CPU estimation)
- Background job execution with pause/cancel
- Graceful failure handling
- Offline-first with automatic sync on reconnect
- Dashboard generation and scheduled reporting

## 🚀 Quick Start

### Prerequisites
- **Node.js**: 18.x or higher
- **Rust**: Latest stable
- **Python**: 3.11+
- **Git**: For version control

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/hamzakhan0712/Novem.git
   cd Novem
   ```

2. **Backend Setup**
   ```bash
   cd backend
   python -m venv venv
   venv\Scripts\activate  # Windows
   pip install -r requirements.txt
   python manage.py migrate
   python manage.py createsuperuser
   python manage.py runserver
   ```

3. **Compute Engine Setup**
   ```bash
   cd compute-engine
   python -m venv venv
   venv\Scripts\activate
   pip install -r requirements.txt
   uvicorn app.main:app --reload --port 8001
   ```

4. **Desktop App Setup**
   ```bash
   cd novem-desktop
   npm install
   npm run tauri dev
   ```

### Building for Production

```bash
cd novem-desktop
npm run tauri build
```

Installers will be generated in `src-tauri/target/release/bundle/`

## 📂 Project Structure

```
Novem/
├── backend/                 # Django REST API
│   ├── accounts/           # User authentication & profiles
│   ├── workspaces/         # Workspace management
│   ├── projects/           # Project CRUD & permissions
│   ├── connectors/         # Data connector configurations
│   ├── analytics/          # Usage analytics
│   ├── audit/              # Audit logging
│   ├── collaboration/      # Invitations & requests
│   └── community/          # Community features
│
├── compute-engine/         # Python FastAPI compute layer
│   ├── app/
│   │   ├── api/routes/    # Analysis, ML, viz endpoints
│   │   ├── core/          # Configuration
│   │   ├── services/      # Business logic
│   │   └── utils/         # Helper functions
│   ├── data/              # Local data storage
│   └── metadata/          # Computation metadata
│
└── novem-desktop/         # Tauri desktop application
    ├── src/               # React frontend
    │   ├── components/    # Reusable UI components
    │   ├── pages/         # Application pages
    │   ├── contexts/      # React contexts (Auth, Theme)
    │   ├── services/      # API & compute clients
    │   └── theme/         # UI theming
    └── src-tauri/         # Rust backend
        ├── src/           # Tauri commands
        └── capabilities/  # Security policies
```

## 🔐 Security & Privacy

- **Zero Raw Data Sync**: Only metadata leaves your machine
- **Encrypted Credentials**: AES-256 for connector secrets
- **Credential Rotation**: Automated expiry and refresh
- **Audit Logging**: Full activity trails for compliance
- **RBAC**: Fine-grained role-based access control
- **Offline Grace Period**: Configurable security window

## 🛠️ Development

### Tech Stack
- **Frontend**: React 18, TypeScript, TailwindCSS
- **Desktop**: Tauri (Rust), WebView
- **Backend**: Django 4.2, Django REST Framework
- **Compute**: FastAPI, Pandas, Scikit-learn, Prophet
- **Database**: PostgreSQL (backend), DuckDB (local analytics)
- **Storage**: SQLite (local metadata), encrypted files

### Running Tests

```bash
# Backend
cd backend
python manage.py test

# Compute Engine
cd compute-engine
pytest

# Desktop (unit tests)
cd novem-desktop
npm test
```

## 📊 Data Flow

1. **Ingestion**: User imports data or configures connector
2. **Processing**: Local Python engine validates and profiles data
3. **Storage**: DuckDB for analytics, versioned snapshots
4. **Analysis**: User executes workflows (EDA, ML, stats)
5. **Results**: Outputs generated locally
6. **Publication**: User explicitly publishes to project/community
7. **Sync**: Only metadata and published artifacts sync to backend

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Tauri](https://tauri.app/)
- Data connectors powered by [Meltano](https://meltano.com/)
- ML pipelines using [Scikit-learn](https://scikit-learn.org/)
- Forecasting with [Prophet](https://facebook.github.io/prophet/)

## 📧 Support

- **Documentation**: [docs.novem.io](https://docs.novem.io) *(placeholder)*
- **Issues**: [GitHub Issues](https://github.com/hamzakhan0712/Novem/issues)
- **Discussions**: [GitHub Discussions](https://github.com/hamzakhan0712/Novem/discussions)
- **Email**: support@novem.io *(placeholder)*

## 🗺️ Roadmap

- [ ] Advanced connector marketplace
- [ ] Real-time collaboration cursors
- [ ] Cloud-hosted compute option (opt-in)
- [ ] Mobile companion app
- [ ] Enterprise SSO integration
- [ ] Custom plugin system

---

**Built with ❤️ for data professionals who value privacy and reproducibility.**