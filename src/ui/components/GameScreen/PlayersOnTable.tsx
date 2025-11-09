import React from "react";
import PlayerUI from "./PlayerUI";
import "./PlayersOnTable.css";

const PlayersOnTable: React.FC = () => {
  return (
    <div className="players-on-table">
      <div className="player-seat player-seat-center">
        <PlayerUI />
      </div>
    </div>
  );
};

export default PlayersOnTable;

